const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');
const citasRoutes = require('./routes/citas.routes');
const cobrosRoutes = require('./routes/cobros.routes');
const tarifarioRoutes = require('./routes/tarifario.routes');
const cajaRoutes = require('./routes/caja.routes');
const negocioRoutes = require('./routes/negocio.routes');
const conversacionesRoutes = require('./routes/conversaciones.routes');
const reactivacionRoutes = require('./routes/reactivacion.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');

const app = express();

// Guarda el body crudo: lo necesita el webhook de WhatsApp para verificar
// la firma HMAC de Meta antes de confiar en el JSON ya parseado.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/cobros', cobrosRoutes);
app.use('/api/tarifario', tarifarioRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/negocio', negocioRoutes);
app.use('/api/conversaciones', conversacionesRoutes);
app.use('/api/reactivacion', reactivacionRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Frontend estático (onpilot_agenda.html, onpilot_login.html) — se sirve
// desde public/, nunca desde la raíz del repo, para no exponer server/ ni .env.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(errorHandler);

module.exports = app;
