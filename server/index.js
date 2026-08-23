require('dotenv').config();
const app = require('./app');
const { iniciarJobs } = require('./jobs');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Onpilot escuchando en http://localhost:${PORT}`);
  iniciarJobs();
});
