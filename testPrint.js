const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const device = new escpos.USB(1208, 3586);
const printer = new escpos.Printer(device);

device.open((error) => {
  if (error) {
    return console.error('Error abriendo el dispositivo:', error);
  }

  printer
    .align('CT')
    .text('Prueba de impresión')
    .cut()
    .close();
});