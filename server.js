/**
 * server.js
 * Ejemplo de servidor Node.js + Express para imprimir vía ESC/POS en red (Ethernet).
 * Mantiene la misma estructura y formato de impresión que tu ejemplo USB original.
 */

const express = require('express');
const cors = require('cors');
const escpos = require('escpos');

// Para que escpos reconozca escpos.Network:
escpos.Network = require('escpos-network');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Ruta para imprimir un ticket con texto, total y QR
 * Recibe en el body:
 *  {
 *    "printerIP": "192.168.1.100",
 *    "printerPort": 9100,
 *    "orderId": 12345,
 *    "total": 150.50
 *  }
 */
app.post('/print', async (req, res) => {
  const { printerIP, printerPort, orderId, total } = req.body;

  try {
    // 1. Crear el dispositivo de red con la IP y puerto recibidos
    const device = new escpos.Network(printerIP, printerPort);
    // 2. Crear la instancia de la impresora
    const printer = new escpos.Printer(device);

    // Convertir orderId a cadena, por si envían número
    const orderIdString = orderId.toString();

    // 3. Abrir la conexión con la impresora
    device.open((error) => {
      if (error) {
        console.error('Error abriendo el dispositivo:', error);
        return res.status(500).json({ error: 'Error abriendo el dispositivo' });
      }

      // 4. Imprimir el contenido (mismo formato que tu ejemplo USB)
      printer
        .text(`Orden #${orderIdString}`)
        .text(`Total: $${parseFloat(total).toFixed(2)} MXN`)
        .qrimage(orderIdString, { type: 'png', mode: 'dhdw' }, (err) => {
          if (err) {
            console.error('Error imprimiendo el código QR:', err);
            return res.status(500).json({ error: 'Error imprimiendo el código QR' });
          }
          // Corte de papel
          printer.cut();
          // Si quisieras abrir la caja al final, podrías descomentar:
          // printer.cashdraw(2);
          printer.close();

          // 5. Responder al cliente
          return res.status(200).json({ message: 'Ticket impreso exitosamente' });
        });
    });
  } catch (error) {
    console.error('Error imprimiendo el ticket:', error);
    return res.status(500).json({ error: 'Error imprimiendo el ticket' });
  }
});

/**
 * Ruta para abrir la caja registradora
 * Recibe en el body:
 *  {
 *    "printerIP": "192.168.1.100",
 *    "printerPort": 9100
 *  }
 */
app.post('/cashdrawer', async (req, res) => {
  const { printerIP, printerPort } = req.body;

  try {
    // 1. Crear el dispositivo de red
    const device = new escpos.Network(printerIP, printerPort);
    const printer = new escpos.Printer(device);

    // 2. Abrir la conexión
    device.open((error) => {
      if (error) {
        console.error('Error abriendo el dispositivo:', error);
        return res.status(500).json({ error: 'Error abriendo el dispositivo' });
      }

      // 3. Enviar el comando para abrir cajón (puerto 2)
      printer.cashdraw(2);
      // 4. Cerrar la impresora
      printer.close();

      // 5. Responder
      return res.status(200).json({ message: 'Caja registradora abierta exitosamente' });
    });
  } catch (error) {
    console.error('Error abriendo la caja registradora:', error);
    return res.status(500).json({ error: 'Error abriendo la caja registradora' });
  }
});

// Puedes ajustar el puerto del servidor Node.js a tu preferencia
const PORT = 3004;
app.listen(PORT, () => {
  console.log(`Servidor de impresión escuchando en el puerto ${PORT}`);
});
