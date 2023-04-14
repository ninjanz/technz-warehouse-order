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

const ORDER_TABLE_WIDTHS = ['5%', '50%', '15%', '15%', '15%'];
const PAGE_HEADER_WIDTHS = ['60%', '20%', '20%'];

const ORDER_TABLE_HEADER =
    [
        [
            { text: 'No', style: 'tableHeader' },
            { text: 'Product Name', style: 'tableHeader' },
            { text: 'Order Quantity', style: 'tableHeader' },
            { text: 'Quantity on Hand', style: 'tableHeader' },
            { text: 'Accepted', style: 'tableHeader' },
        ],
        ['', '', '', '', '',] // spacing for rowSpan = 2
    ];

const TABLE_FOOTER = {
    text: 'This is not an invoice. This is a computer generated document and does not require a signature',
    style: 'footerStyle',
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

    return [...ORDER_TABLE_HEADER, ...rows];
}

async function createOrderPdf(orderDetails) {
    try {
        const { name, address, number, date, pdfList } = orderDetails;
        const printer = new PdfPrinter(FONTS);

        const docDefinition = {
            content: [
                // Page Title
                {
                    text: `Store Order List`,
                    bold: true,
                    fontSize: 20,
                    alignment: 'center'
                },
                // Invoice Header
                {
                    table: {
                        widths: PAGE_HEADER_WIDTHS,
                        body: [
                            [
                                { text: `${name}`, style: { bold: true } },
                                { text: `Invoice #:`, style: { bold: true, alignment: 'right' } },
                                { text: `${number}`, style: { alignment: 'left' } },
                            ],
                            [
                                { text: `${address}`, rowSpan: 3 }, 
                                { text: `Order Date:`, style: { bold: true, alignment: 'right' } }, 
                                { text: `${date}`,style: { alignment: 'left' } }
                            ],
                            // To provide spacing for RowSpan
                            [{ text: '' }, { text: '' }, { text: '' }],
                            [{ text: '' }, { text: '' }, { text: '' }],
                        ]
                    },
                    layout: {
                        // function to change line width of cells
                        hLineWidth: function (i, node) {
                            if (i === node.table.body.length) return 2;
                        },
                        vLineWidth: function (i, node) {
                            return 0;
                        }
                    },
                },
                /*{
                    columns: [
                        {
                            text: `${name}\n`,
                            fontSize: 16,
                            bold: true,
                            width: '50%'
                        }, {
                            text: `Order #: ${number}`,
                            alignment: 'right',
                            fontSize: 16
                        },]
                },
                {
                    columns: [
                        {
                            text: `${address}\n`,
                            fontSize: 16,
                            width: '50%'
                        },
                        {
                            text: `Order Date: ${date}`,
                            alignment: 'right',
                            fontSize: 16
                        },]
                },*/
                // Order Details
                {
                    table: {
                        widths: ORDER_TABLE_WIDTHS,
                        headerRows: 1,
                        body: await createOrderTableBody(pdfList),
                    },
                    layout: {
                        // function to change line width of cells
                        hLineWidth: function (i, node) {
                            if (i === 0 || (i === 1) || i === node.table.body.length) return 2;
                            else return 1;
                        },
                        vLineWidth: function (i, node) {
                            return 0;
                        }
                    },
                },],
            defaultStyle: {
                font: 'FiraSans',
                fontSize: 12,
            },
            styles: {
                footerStyle: {
                    fontSize: 10,
                    italics: true,
                    alignment: 'center',
                },
                orderTableHeader: {
                    bold: true,
                    rowSpan: 2,
                    alignment: 'center',
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
