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
        .align("CT")
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

    const options = { encoding: "ISO8859-1" };

    // 2. Crear la instancia de la impresora
    const printer = new escpos.Printer(device, options);

    const dateHour = new Date().toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
    });

    // 3. Abrir la conexión con la impresora
    device.open((error) => {
      if (error) {
        console.error("Error abriendo el dispositivo:", error);
        return res.status(500).json({ error: "Error abriendo el dispositivo" });
      }

      // 4. Imprimir el contenido
      // -- Ejemplo: centrar y poner nombre de la tienda (header)
      printer
        .align("CT")
        .style("B") // 'B' = negrita, 'NORMAL' = sin estilo, 'U' = subrayado, etc.
        .text(header)
        .text(`Número de Orden: ${orderId}`)
        .text(`Fecha: ${dateHour}`) // Agregar la fecha y hora aquí
        .text("--------------------------------");

      // -- Regresamos a la izquierda para imprimir la lista de items
      printer.align("LT").style("NORMAL");

      // Definir el ancho máximo para la línea completa (ajústalo según tu impresora)
      const maxLineWidth = 42; // Para 80mm, normalmente 42-48 caracteres
      const priceWidth = 10; // Espacio reservado para el precio
      const textWidth = maxLineWidth - priceWidth; // Espacio para el nombre y cantidad
      const formatCurrency = (amount) => {
        return `$${parseFloat(amount).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`;
      };

      // 5. Imprimir cada artículo (items)
      items.forEach((item) => {
        const { name, price, quantity } = item;

        // Formatear el texto del producto
        const itemText = `${quantity} x ${name}`.padEnd(textWidth, " ");
        const priceText = formatCurrency(price * quantity).padStart(
          priceWidth,
          " "
        );

        printer.text(itemText + priceText);
      });

      // 6. Imprimir subtotales y total alineados a la derecha
      printer.text("-".repeat(maxLineWidth));

      const formatRight = (label, amount) => {
        const labelText = label.padEnd(maxLineWidth - priceWidth, " ");
        const amountText = formatCurrency(amount).padStart(priceWidth, " ");
        return labelText + amountText;
      };

      printer.text(formatRight("Subtotal:", subtotal));
      printer.text(formatRight("IVA:", iva));
      // Total en grande y en negrita
      printer
        .size(0, 1) // Tamaño grande
        .text(formatRight("Total:", total))
        .size(0, 0); // Restablecer tamaño de texto

      printer.text("-".repeat(maxLineWidth));

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
 * Ruta para imprimir un recibo de pago de préstamo
 * Espera en el body (JSON):
 * {
 *   "printerIP": "192.168.1.100",
 *   "printerPort": 9100,
 *   "header": "Astrova",
 *   "loanId": "PRE-000123",
 *   "borrower": "Juan Pérez",
 *   "paymentId": "RC-2025-0001",         // opcional (número de recibo)
 *   "paymentDate": "2025-07-01T16:20:00Z",// opcional, ISO o fecha válida
 *   "method": "Efectivo",                 // opcional
 *   "reference": "CAJA-1",                // opcional
 *   "principal": 1000,                     // capital pagado
 *   "interest": 120,                       // interés pagado
 *   "amount": 1120,                        // total pagado
 *   "remainingBalance": 3880,              // saldo restante
 *   "nextDueDate": "2025-08-01",          // opcional
 *   "footer": "¡Gracias por su pago!"     // opcional
 * }
 */
app.post("/printloanpayment", async (req, res) => {
  const {
    printerIP,
    printerPort,
    header = "Astrova",
    loanId,
    borrower,
    paymentId,
    paymentDate,
    method,
    reference,
    principal = 0,
    interest = 0,
    amount = 0,
    remainingBalance = 0,
    nextDueDate,
    footer = "¡Gracias por su pago!",
  } = req.body;

  // Validaciones mínimas
  if (!printerIP || !printerPort) {
    return res
      .status(400)
      .json({ error: "printerIP y printerPort son requeridos" });
  }

  try {
    const device = new escpos.Network(printerIP, printerPort);
    const options = { encoding: "ISO8859-1" };
    const printer = new escpos.Printer(device, options);

    const dateHour = (() => {
      const d = paymentDate ? new Date(paymentDate) : new Date();
      return d.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    })();

    device.open((error) => {
      if (error) {
        console.error("Error abriendo el dispositivo:", error);
        return res.status(500).json({ error: "Error abriendo el dispositivo" });
      }

      // Configuración de formato
      const maxLineWidth = 42; // típico 80mm
      const priceWidth = 12; // ancho para montos
      const textWidth = maxLineWidth - priceWidth;

      const toNumber = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 0;
      };

      const formatCurrency = (amount) =>
        `$${toNumber(amount).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`;

      const formatRight = (label, amount) => {
        const labelText = String(label).padEnd(textWidth, " ");
        const amountText = formatCurrency(amount).padStart(priceWidth, " ");
        return labelText + amountText;
      };

      // Impresión del recibo
      try {
        printer
          .align("CT")
          .style("B")
          .text(header || "")
          .text("Pago de Préstamo")
          .style("NORMAL")
          .text(`Fecha: ${dateHour}`)
          .text("--------------------------------");

        printer.align("LT");

        if (loanId) printer.text(`Préstamo: ${loanId}`);
        if (borrower) printer.text(`Cliente: ${borrower}`);
        if (paymentId) printer.text(`Recibo: ${paymentId}`);
        if (method) printer.text(`Método: ${method}`);
        if (reference) printer.text(`Referencia: ${reference}`);
        if (nextDueDate) printer.text(`Próximo pago: ${nextDueDate}`);

        printer.text("-".repeat(maxLineWidth));

        // Desglose de pago
        printer.text(formatRight("Capital:", principal));
        printer.text(formatRight("Interés:", interest));
        printer
          .style("B")
          .size(0, 1)
          .text(formatRight("Total Pagado:", amount))
          .size(0, 0)
          .style("NORMAL");

        printer.text("-".repeat(maxLineWidth));

        // Saldo restante destacado
        printer
          .style("B")
          .text(formatRight("Saldo Restante:", remainingBalance))
          .style("NORMAL");

        printer.text("--------------------------------");
        printer
          .align("CT")
          .style("B")
          .text(footer || "")
          .style("NORMAL");

        // Corte y cierre
        printer.cut();
        printer.close();

        return res
          .status(200)
          .json({ message: "Recibo de pago impreso exitosamente" });
      } catch (printErr) {
        console.error("Error durante la impresión:", printErr);
        try {
          printer.close();
        } catch (_) {}
        return res.status(500).json({ error: "Error durante la impresión" });
      }
    });
  } catch (error) {
    console.error("Error general al imprimir el recibo:", error);
    return res.status(500).json({ error: "Error imprimiendo el recibo" });
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
    // console.error("Error abriendo la caja registradora:", error);
    // return res
    //   .status(500)
    //   .json({ error: "Error abriendo la caja registradora" });
  }
});

// Puedes ajustar el puerto del servidor Node.js a tu preferencia
const PORT = 3004;
app.listen(PORT, () => {
  console.log(`Servidor de impresión escuchando en el puerto ${PORT}`);
});
