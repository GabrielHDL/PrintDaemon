/**
 * server.js
 * Ejemplo de servidor Node.js + Express para imprimir vía ESC/POS en red (Ethernet).
 * Mantiene la misma estructura y formato de impresión que tu ejemplo USB original.
 */

const express = require("express");
const cors = require("cors");
const escpos = require("escpos");

// Para que escpos reconozca escpos.Network:
escpos.Network = require("escpos-network");

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
app.post("/printturn", async (req, res) => {
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
        console.error("Error abriendo el dispositivo:", error);
        return res.status(500).json({ error: "Error abriendo el dispositivo" });
      }

      // 4. Imprimir el contenido (mismo formato que tu ejemplo USB)
      printer
        .text(`Orden #${orderIdString}`)
        .text(`Total: $${parseFloat(total).toFixed(2)} MXN`)
        .qrimage(orderIdString, { type: "png", mode: "dhdw" }, (err) => {
          if (err) {
            console.error("Error imprimiendo el código QR:", err);
            return res
              .status(500)
              .json({ error: "Error imprimiendo el código QR" });
          }
          // Corte de papel
          printer.cut();
          // Si quisieras abrir la caja al final, podrías descomentar:
          // printer.cashdraw(2);
          printer.close();

          // 5. Responder al cliente
          return res
            .status(200)
            .json({ message: "Ticket impreso exitosamente" });
        });
    });
  } catch (error) {
    console.error("Error imprimiendo el ticket:", error);
    return res.status(500).json({ error: "Error imprimiendo el ticket" });
  }
});

/**
 * Ejemplo de implementación de la ruta /printticket
 * que imprime un ticket con varios artículos, subtotal, IVA, total y un mensaje de despedida.
 */

// ...
// Resto de imports y configuración igual a tu server.js
// ...

app.post("/printticket", async (req, res) => {
  /**
   * Esperamos en el body (JSON) algo como:
   * {
   *   "printerIP": "192.168.1.100",
   *   "printerPort": 9100,
   *   "header": "Mi Tienda S.A. de C.V.",
   *   "items": [
   *     { "name": "Producto A", "price": 50, "quantity": 2 },
   *     { "name": "Producto B", "price": 80, "quantity": 1 }
   *   ],
   *   "subtotal": 180,
   *   "iva": 28.8,
   *   "total": 208.8,
   *   "footer": "¡Gracias por tu compra!"
   * }
   */
  const {
    printerIP,
    printerPort,
    orderId,
    header = "Astrova",
    items = [],
    subtotal = 0,
    iva = 0,
    total = 0,
    footer = `¡Gracias por comprar en ${header}!`,
  } = req.body;

  try {
    // 1. Crear el dispositivo de red con la IP y puerto
    const device = new escpos.Network(printerIP, printerPort);

    const options = { encoding: "CP858" };

    // 2. Crear la instancia de la impresora
    const printer = new escpos.Printer(device, options);

    // 3. Abrir la conexión con la impresora
    device.open((error) => {
      if (error) {
        console.error("Error abriendo el dispositivo:", error);
        return res.status(500).json({ error: "Error abriendo el dispositivo" });
      }

      // 4. Comenzar la impresión:
      // -- Ejemplo: centrar y poner nombre de la tienda (header)
      printer
        .align("CT")
        .style("B") // 'B' = negrita, 'NORMAL' = sin estilo, 'U' = subrayado, etc.
        .text(header)
        .text(`Numero de Orden: ${orderId}`)
        .text("--------------------------------");

      // -- Regresamos a la izquierda para imprimir la lista de items
      printer.align("LT").style("NORMAL");

      // 5. Imprimir cada artículo (items)
      items.forEach((item) => {
        const { name, price, quantity } = item;
        // Puedes formatear líneas como gustes; aquí un ejemplo rápido:
        printer.text(`${quantity} x ${name}`);
        printer.text(`   $${parseFloat(price).toFixed(2)} c/u`);
      });

      // 6. Imprimir subtotales y total
      printer.text("--------------------------------");
      printer.text(`Subtotal: $${parseFloat(subtotal).toFixed(2)}`);
      printer.text(`IVA: $${parseFloat(iva).toFixed(2)}`);
      printer.text(`Total: $${parseFloat(total).toFixed(2)}`);
      printer.text("--------------------------------");

      // 7. Mensaje final (footer)
      printer.align("CT").style("B").text(footer);

      printer.text("--------------------------------");

      // 8. Corte de papel
      printer.cut();

      // 9. Cerrar la impresora
      printer.close();

      // 10. Responder al cliente
      return res.status(200).json({ message: "Ticket impreso exitosamente" });
    });
    console.log("Ticket impreso exitosamente");
  } catch (error) {
    console.error("Error imprimiendo el ticket:", error);
    return res.status(500).json({ error: "Error imprimiendo el ticket" });
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
app.post("/cashdrawer", async (req, res) => {
  const { printerIP, printerPort } = req.body;

  try {
    // 1. Crear el dispositivo de red
    const device = new escpos.Network(printerIP, printerPort);
    const printer = new escpos.Printer(device);

    // 2. Abrir la conexión
    device.open((error) => {
      if (error) {
        console.error("Error abriendo el dispositivo:", error);
        return res.status(500).json({ error: "Error abriendo el dispositivo" });
      }

      // 3. Enviar el comando para abrir cajón (puerto 2)
      printer.cashdraw(2);
      // 4. Cerrar la impresora
      printer.close();

      // 5. Responder
      return res
        .status(200)
        .json({ message: "Caja registradora abierta exitosamente" });
    });
  } catch (error) {
    console.error("Error abriendo la caja registradora:", error);
    return res
      .status(500)
      .json({ error: "Error abriendo la caja registradora" });
  }
});

// Puedes ajustar el puerto del servidor Node.js a tu preferencia
const PORT = 3004;
app.listen(PORT, () => {
  console.log(`Servidor de impresión escuchando en el puerto ${PORT}`);
});
