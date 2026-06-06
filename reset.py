import sqlite3
conn = sqlite3.connect('vestr.db')
conn.execute('DELETE FROM users')
conn.execute('DELETE FROM watchlist')
conn.execute('DELETE FROM portfolio')
conn.commit()
conn.close()
print('Done — all users and data cleared')