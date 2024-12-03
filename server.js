const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const app = express();
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json());

app.post('/print', async (req, res) => {
  const { orderId, total, idProduct, idVendor } = req.body;

  try {
    // Especificar el dispositivo USB utilizando el ID del fabricante y del producto
    const device = new escpos.USB(idVendor, idProduct); // Usar los IDs recibidos
    const printer = new escpos.Printer(device);

    // Asegurarse de que orderId sea una cadena válida
    const orderIdString = orderId.toString();

    device.open((error) => {
      if (error) {
        console.error('Error abriendo el dispositivo:', error);
        return res.status(500).json({ error: 'Error abriendo el dispositivo' });
      }

      printer
        .text(`Orden #${orderIdString}`)
        .text(`Total: $${total.toFixed(2)} MXN`)
        .qrimage(orderIdString, { type: 'png', mode: 'dhdw' }, function (err) {
          if (err) {
            console.error('Error imprimiendo el código QR:', err);
            return res.status(500).json({ error: 'Error imprimiendo el código QR' });
          }
          printer.cut();
        //   printer.cashdraw(2); // Comando para abrir la caja registradora
          printer.close();
          res.status(200).json({ message: 'Ticket impreso exitosamente y caja abierta' });
        });
    });
  } catch (error) {
    console.error('Error imprimiendo el ticket:', error);
    res.status(500).json({ error: 'Error imprimiendo el ticket' });
  }
});

app.post('/cashdrawer', async (req, res) => {
    const { idProduct, idVendor } = req.body;

  try {
    // Especificar el dispositivo USB utilizando el ID del fabricante y del producto
    const device = new escpos.USB(idVendor, idProduct); // Usar los IDs recibidos
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        console.error('Error abriendo el dispositivo:', error);
        return res.status(500).json({ error: 'Error abriendo el dispositivo' });
      }

      printer.cashdraw(2); // Comando para abrir la caja registradora
      printer.close();
      res.status(200).json({ message: 'Caja registradora abierta exitosamente' });
    });
  } catch (error) {
    console.error('Error abriendo la caja registradora:', error);
    res.status(500).json({ error: 'Error abriendo la caja registradora' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor de impresión escuchando en el puerto ${PORT}`);
});