import pyodbc
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

conn_str = (
    'Driver={ODBC Driver 18 for SQL Server};'
    'Server=tcp:DESKTOP-D1G6NC0;'
    'Database=FinanceDB;'
    'Trusted_Connection=yes;'
    'TrustServerCertificate=yes;'
)


def db_q(q, params=(), fetch=True):
  conn = pyodbc.connect(conn_str)
  cur = conn.cursor()
  cur.execute(q, params)
  if fetch:
    cols = [c[0] for c in cur.description]
    res = [dict(zip(cols, r)) for r in cur.fetchall()]
    conn.close()
    return res
  conn.commit()
  conn.close()


@app.route('/')
def index():
  return send_from_directory('.', 'index.html')


@app.route('/api/state', methods=['GET'])
def get_state():
  bal_res = db_q(
      "SELECT ISNULL(SUM(CASE WHEN LOWER(Type) = 'in' THEN Amount ELSE -Amount"
      ' END), 0) as bal FROM Transactions'
  )
  drawer_bal = bal_res[0]['bal'] if bal_res else 0
  return jsonify({
      'drawerBalance': float(drawer_bal),
      'logs': db_q(
          "SELECT Id as id, ISNULL(CONVERT(varchar(5), TransactionDate, 108),"
          " '00:00') as time, Type as type, Amount as amount, Description as"
          ' note FROM Transactions ORDER BY Id DESC'
      ),
      'services': db_q(
          'SELECT Id as id, Num as num, Client as client, Cost as cost, Status'
          ' as status FROM Services ORDER BY Id DESC'
      ),
      'debtors': db_q(
          'SELECT Id as id, Name as name, Amount as amount, Reason as reason'
          ' FROM Debtors ORDER BY Id DESC'
      ),
      'creditors': db_q(
          'SELECT Id as id, Name as name, Amount as amount, Reason as reason'
          ' FROM Creditors ORDER BY Id DESC'
      ),
  })


@app.route('/api/sync')
def sync():
  return get_state()


@app.route('/api/transactions', methods=['POST'])
def add_tr():
  d = request.json
  db_q(
      'INSERT INTO Transactions (Type, Amount, Description) VALUES (?, ?, ?)',
      (d.get('type'), d.get('amount'), d.get('note')),
      False,
  )
  return jsonify({'status': 'ok'})


@app.route('/api/transactions/<int:id>', methods=['DELETE'])
def del_tr(id):
  db_q('DELETE FROM Transactions WHERE Id = ?', (id,), False)
  return jsonify({'status': 'ok'})


@app.route('/api/services', methods=['POST'])
def add_srv():
  d = request.json
  db_q(
      'INSERT INTO Services (Num, Client, Cost, Status) VALUES (?, ?, ?, ?)',
      (d.get('num'), d.get('client'), d.get('cost'), d.get('status')),
      False,
  )
  return jsonify({'status': 'ok'})


@app.route('/api/services/<int:id>', methods=['DELETE'])
def del_srv(id):
  db_q('DELETE FROM Services WHERE Id = ?', (id,), False)
  return jsonify({'status': 'ok'})


@app.route('/api/debtors', methods=['POST'])
def add_deb():
  d = request.json
  db_q(
      'INSERT INTO Debtors (Name, Amount, Reason) VALUES (?, ?, ?)',
      (d.get('name'), d.get('amount'), d.get('reason')),
      False,
  )
  return jsonify({'status': 'ok'})


@app.route('/api/debtors/<int:id>', methods=['PUT'])
def up_deb(id):
  amt = request.json.get('amount', 0)
  db_q(
      'DELETE FROM Debtors WHERE Id = ?'
      if amt <= 0
      else 'UPDATE Debtors SET Amount = ? WHERE Id = ?',
      (id,) if amt <= 0 else (amt, id),
      False,
  )
  return jsonify({'status': 'ok'})


@app.route('/api/creditors', methods=['POST'])
def add_cred():
  d = request.json
  db_q(
      'INSERT INTO Creditors (Name, Amount, Reason) VALUES (?, ?, ?)',
      (d.get('name'), d.get('amount'), d.get('reason')),
      False,
  )
  return jsonify({'status': 'ok'})


@app.route('/api/creditors/<int:id>', methods=['PUT'])
def up_cred(id):
  amt = request.json.get('amount', 0)
  db_q(
      'DELETE FROM Creditors WHERE Id = ?'
      if amt <= 0
      else 'UPDATE Creditors SET Amount = ? WHERE Id = ?',
      (id,) if amt <= 0 else (amt, id),
      False,
  )
  return jsonify({'status': 'ok'})


if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000)