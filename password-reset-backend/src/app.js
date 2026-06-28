const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const { initDb } = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'labhansh.ai Password Reset API is running' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database connection:', error);
    process.exit(1);
  });
