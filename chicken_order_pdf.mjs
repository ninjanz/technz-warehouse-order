import PdfPrinter from 'pdfmake';

var FONTS = {
    FiraSans: {
        normal: 'fonts/FiraSans-Regular.ttf',
        bold: 'fonts/FiraSans-Medium.ttf',
        italics: 'fonts/FiraSans-Italic.ttf',
    },
    Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
    },
};

const ORDER_TABLE_WIDTHS = ['10%', '50%', '40%'];
const TABLE_WIDTH_2 = ['25%', '25%', '25%', '25%'];

const ORDER_TABLE_HEADER = [
    { text: 'No', style: 'orderTableHeader' },
    { text: 'Product', style: 'orderTableHeader' },
    { text: 'Order Quantity', style: 'orderTableHeader' },
];

async function createOrderTableBody(order) {
    const fillCell = (idx) => idx % 2 === 0 ? '#EAFAF1' : '#D5F5E3';

    const rows = order.map((item, idx) => [
        { text: idx + 1, alignment: 'center', fillColor: fillCell(idx) },
        { text: item.product, fillColor: fillCell(idx), alignment: 'left' },
        { text: item.quantity, fillColor: fillCell(idx) }
    ]);

    return [ORDER_TABLE_HEADER, ...rows];
}

async function createPurchaseOrder(orderDetails) {
    try {
        const { location, date, items } = orderDetails;
        const printer = new PdfPrinter(FONTS);

        const docDefinition = {
            content: [
                {
                    text: 'Chicken Purchase Order',
                    bold: true,
                    fontSize: 30,
                    alignment: 'center',
                    lineHeight: 2,
                },
                {
                    table: {
                        widths: TABLE_WIDTH_2,
                        body: [
                            [
                                { text: 'Outlet: ', bold: true, alignment: 'right' },
                                { text: location, alignment: 'left' }
                            ], 
                            [
                                { text: 'Date of Order: ', bold: true, alignment: 'right' },
                                { text: date, alignment: 'left' }
                            ]
                        ],
                    },
                    layout: {
                        hLineWidth: function (i, node) { return 0 },
                        vLineWidth: function (i, node) { return 0 }
                    }
                },
                {text: '\n'},
                {
                    table: {
                        widths: ORDER_TABLE_WIDTHS,
                        headerRows: 1,
                        body: await createOrderTableBody(items),
                    },
                    layout: {
                        hLineWidth: function (i, node) {
                            return (i === 0 || i === node.table.body.length) ? 2 : 0.5;
                        },
                        vLineWidth: function (i) {
                            return 0.5;
                        },
                    },
                },
                { text: `\n\nNote:`, alignment: 'left' },
                {ul: [
                    'P8 OR P10 -- 1.90 - 2.00 kg',
                    'P4 OR P16 -- 1.60 - 1.70 kg (buang kulit)',
                    'Bulat -- 2.00 kg',
                ], alignment: 'left'}
            ],
            defaultStyle: {
                font: 'FiraSans',
                fontSize: 18,
                alignment: 'center',
            },
            styles: {
                orderTableHeader: {
                    bold: true,
                    alignment: 'center',
                    fontSize: 20,
                },
            },
        };

        const doc = printer.createPdfKitDocument(docDefinition);
        let chunks = [];
        let result;

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
            result = Buffer.concat(chunks);
            // This result is what you might send or save
        });
        doc.end();

        // Since PDF creation is asynchronous and involves event listeners,
        // you need to handle the asynchronous nature properly, perhaps by returning a promise
        // Here is a placeholder to indicate you need to wait for the 'end' event
        // Adjust according to your environment's capabilities to handle async operations
        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(result));
            doc.on('error', reject);
        });

    } catch (err) {
        console.error(err);
        throw err; // Rethrow or handle as needed
    }
}

export { createPurchaseOrder };
