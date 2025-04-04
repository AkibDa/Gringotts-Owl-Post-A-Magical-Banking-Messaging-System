from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime
import hashlib
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

users_db = {}
vaults_db = {}
owl_post = []
exchange_rates = {
    'galleon': 600.0,
    'sickle': 35.0,
    'knut': 1.2
}
valid_spells = ["alohomora", "expelliarmus", "wingardium leviosa"]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = hashlib.sha256(request.form['password'].encode()).hexdigest()
        
        if username in users_db and users_db[username]['password'] == password:
            session['username'] = username
            return redirect(url_for('banking'))
        return render_template('login.html', error="Invalid credentials")
    
    if 'username' in session:
        return redirect(url_for('banking'))
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        if username in users_db:
            return render_template('register.html', error="Username already exists")
        
        password = hashlib.sha256(request.form['password'].encode()).hexdigest()
        house = request.form['house']
        
        users_db[username] = {
            'password': password,
            'house': house
        }
        
        vaults_db[username] = {
            'galleons': 100,
            'sickles': 50,
            'knuts': 100
        }
        
        session['username'] = username
        return redirect(url_for('banking'))
    
    if 'username' in session:
        return redirect(url_for('banking'))
    return render_template('register.html')

@app.route('/banking')
def banking():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('banking.html', username=session['username'])
  
from flask import send_from_directory

@app.route('/static/<path:filename>')
def static_files(filename):
  return send_from_directory('static', filename)

@app.route('/logout')
def logout():
  session.pop('username', None)
  return redirect(url_for('login'))

@app.route('/api/convert', methods=['POST'])
def convert_currency():
  if 'username' not in session:
      return jsonify({'error': 'Unauthorized'}), 401
  
  data = request.get_json()
  amount = float(data['amount'])
  
  if data['from'] == "INR" and data['to'] == "wizard":
      knuts = amount / exchange_rates['knut']
      sickles, knuts = divmod(knuts, 29)
      galleons, sickles = divmod(sickles, 17)
      return jsonify({
          'galleons': int(galleons),
          'sickles': int(sickles),
          'knuts': round(knuts)
      })
  return jsonify({'error': 'Invalid conversion'}), 400

@app.route('/api/send_owl', methods=['POST'])
def send_owl():
  if 'username' not in session:
      return jsonify({'error': 'Unauthorized'}), 401

  try:
      data = request.get_json()
      required_fields = ['recipient', 'amount', 'spell']
      if not all(field in data for field in required_fields):
          return jsonify({'error': 'Missing required fields'}), 400

      sender = session['username']
      recipient = data['recipient']
      
      if recipient not in vaults_db:
          return jsonify({'error': 'Recipient not found'}), 404

      valid_spells = ["alohomora", "expelliarmus", "wingardium leviosa"]
      if data['spell'].lower() not in valid_spells:
          return jsonify({'error': 'Invalid spell'}), 400

      amount = data['amount']
      transfer_amount = amount.get('galleons', 0) * 17 * 29 + amount.get('sickles', 0) * 29 + amount.get('knuts', 0)
      
      sender_balance = vaults_db[sender]
      sender_total = sender_balance['galleons'] * 17 * 29 + sender_balance['sickles'] * 29 + sender_balance['knuts']
      
      if transfer_amount > sender_total:
          return jsonify({'error': 'Insufficient funds'}), 400

      vaults_db[sender]['galleons'] -= amount.get('galleons', 0)
      vaults_db[sender]['sickles'] -= amount.get('sickles', 0)
      vaults_db[sender]['knuts'] -= amount.get('knuts', 0)
      
      vaults_db[recipient]['galleons'] += amount.get('galleons', 0)
      vaults_db[recipient]['sickles'] += amount.get('sickles', 0)
      vaults_db[recipient]['knuts'] += amount.get('knuts', 0)

      owl_post.append({
          'sender': sender,
          'recipient': recipient,
          'message': data.get('message', ''),
          'amount': amount,
          'timestamp': datetime.now().isoformat(),
          'spell': data['spell']
      })

      return jsonify({'success': True, 'message': 'Transfer successful'})

  except Exception as e:
      return jsonify({'error': str(e)}), 500

@app.route('/api/vault')
def get_vault():
  if 'username' not in session:
      return jsonify({'error': 'Unauthorized'}), 401
  return jsonify(vaults_db.get(session['username'], {}))

if __name__ == '__main__':
    app.run(debug=True)