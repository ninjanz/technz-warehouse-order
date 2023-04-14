import PdfPrinter from 'pdfmake';

const FONTS = {
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

const TABLE_WIDTHS = [
    '5%', '50%', '15%', '15%', '15%'
];

const TABLE_HEADER = [[
    { text: 'No', style: 'tableHeader' },
    { text: 'Product Name', style: 'tableHeader' },
    { text: 'Order Quantity', style: 'tableHeader' },
    { text: 'Quantity on Hand', style: 'tableHeader' },
    { text: 'Accepted', style: 'tableHeader' },
],
// spacing for rowSpan = 2
['', '', '', '', '',]];

const TABLE_FOOTER = {
    text: 'This is not an invoice. This is a computer generated document and does not require a signature',
    style: ['footer', 'alignCenter'],
};

async function createOrderTableBody(orderDetails) {
    const fillCell = (idx, isAccepted) =>
        idx % 2 === 0 ? (isAccepted ? '#EAFAF1' : '#F9EBEA') : isAccepted ? '#D5F5E3' : '#F2D7D5';

    const rows = [
        ...orderDetails.map((item, idx) => [
            { text: idx + 1, alignment: 'center', fillColor: fillCell(idx, item.acceptedBool) },
            { text: item.name, fillColor: fillCell(idx, item.acceptedBool) },
            { text: item.qty, alignment: 'center', fillColor: fillCell(idx, item.acceptedBool) },
            { text: item.qtyAvailable, alignment: 'center', fillColor: fillCell(idx, item.acceptedBool) },
            { text: item.acceptedBool ? 'Y' : 'N', alignment: 'center', fillColor: fillCell(idx, item.acceptedBool) },
        ]),
    ];

    return [...TABLE_HEADER, ...rows];
}

async function createOrderPdf(orderDetails) {
    try {
        const { name, address, number, date, pdfList } = orderDetails;
        const printer = new PdfPrinter(FONTS);

        const docDefinition = {
            content: [
                {
                    text: 'NZ Curry House @ Warehouse\n\n',
                    bold: true,
                    fontSize: 20,
                    alignment: 'center'
                },
                {
                    columns: [
                        {
                            text: `${name}\n`,
                            fontSize: 16,
                            bold: true,
                            width: '50%'
                        }]
                },
                {
                    columns: [
                        {
                            text: `${address}\n`,
                            fontSize: 16,
                            width: '50%'
                        }]
                },
                {
                    columns: [
                        {
                            text: `Order #: ${number}`,
                            alignment: 'left',
                            fontSize: 16
                        },
                        {
                            text: `Order List`,
                            alignment: 'center',
                            bold: true,
                            fontSize: 16
                        },
                        {
                            text: `Order Date: ${date}`,
                            alignment: 'right',
                            fontSize: 16
                        },]
                },
                {
                    table: {
                        widths: TABLE_WIDTHS,
                        headerRows: 1,
                        body: await createOrderTableBody(pdfList),
                        layout: {
                            // function to change line width of cells
                            hLineWidth: function (i, node) {
                                if (i === 0 || i === node.table.body.length) return 0;
                                else if (i === 1) return 2;
                                else return 1;
                            },
                            vLineWidth: 0,
                        }
                    },
                },],
            styles: {
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize: 12
                },
                footer: {
                    fontSize: 10,
                    italics: true,
                },
                tableHeader: {
                    bold: true,
                    rowSpan: 2,
                    alignment: 'center',
                    noWrap: false, // to allow text wrapping
                },
            },
            footer: TABLE_FOOTER,

        }

        //console.log(`doc definition: ${JSON.stringify(docDefinition)}`);
        const doc = printer.createPdfKitDocument(docDefinition);
        doc.end();

        return doc
    } catch (err) { console.log(err); }
}

export { createOrderPdf };