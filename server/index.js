require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Onpilot H1 escuchando en http://localhost:${PORT}`);
});
