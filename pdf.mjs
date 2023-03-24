import PdfPrinter from 'pdfmake';

const FONTS = {
    Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
    },
};

const TABLE_WIDTHS = [
    '5%', '60%', '20%', '15%'
];

const TABLE_HEADER = [
    { text: 'No', style: 'tableHeader' },
    { text: 'Product Name', style: 'tableHeader' },
    { text: 'Order Quantity', style: 'tableHeader' },
    { text: 'Accepted', style: 'tableHeader' },
];

const TABLE_FOOTER = {
    text: 'This is not an invoice. This is a computer generated document and does not require a signature',
    style: ['footer', 'alignCenter'],
};

async function createOrderTableBody(acceptedItems, rejectedItems) {
    const fillCell = (idx, isAccepted) =>
        idx % 2 === 0 ? (isAccepted ? '#EAFAF1' : '#F9EBEA') : isAccepted ? '#D5F5E3' : '#F2D7D5';

    const rows = [
        ...acceptedItems.map((item, idx) => [
            { text: idx + 1, alignment: 'center', fillColor: fillCell(idx, true) },
            { text: item.SalesItemLineDetail.ItemRef.name, fillColor: fillCell(idx, true) },
            { text: item.SalesItemLineDetail.Qty, alignment: 'center', fillColor: fillCell(idx, true) },
            { text: 'Y', alignment: 'center', fillColor: fillCell(idx, true) },
        ]),
        ...rejectedItems.map((item, idx) => [
            { text: idx + 1, alignment: 'center', fillColor: fillCell(idx, false) },
            { text: item.name, fillColor: fillCell(idx, false) },
            { text: item.qty, alignment: 'center', fillColor: fillCell(idx, false) },
            { text: 'N', alignment: 'center', fillColor: fillCell(idx, false) },
        ]),
    ];

    return [...TABLE_HEADER, ...rows];
}

async function createOrderPdf(orderDetails) {
    const { name, address, number, date, stock, nostock } = orderDetails;
    const printer = new PdfPrinter(FONTS)

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
                    body: createOrderTableBody(stock, nostock),
                    layout: {
                        hLineWidth: function (i, node) {
                            if (i === 0 || i === node.table.body.length) return 0
                            else if (i === 1) return 2
                            else return 1
                        },
                        vLineWidth: 0,

                    }
                },
            },],
        styles: {
            defaultStyle: {
                font: 'Roboto',
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
            },
        },
        footer: TABLE_FOOTER,

    }

    const doc = await printer.createPdfKitDocument(docDefinition)
    doc.end();

    return doc
}

export { createOrderPdf };