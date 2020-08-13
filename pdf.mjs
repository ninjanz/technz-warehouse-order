import PdfPrinter from 'pdfmake';

const docFonts = {
    Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italic: 'fonts/Roboto-Italic.ttf',
    },
};

const docStyles = {
    header: {
        font: 'Roboto',
        bold: true,
        decoration: 'underline',
    },
    title: {
        fontSize: 20,
        alignment: 'center',
    },
    subtitle: {
        fontSize: 16,
    },
    text: {
        fontSize: 12,
    },
    footer: {
        fontSize: 10,
        italics: true,
        alignment: 'center'
    }
}

async function invoiceTemplate(params) {

    const template = {
        pageHeader = {
            text: 'NZ Curry House @ Plastic Supplies',
            style: ['header', 'title'],
        },
        customerDetails = {
            columns: [
                {
                    text: `Order Form for ${params.name}\n${params.address}\n`,
                    width: '30%',
                },
            ],
        },
        orderDetails = {
            columns: [
                {
                    text: `Order #: ${params.number}`,
                    alignment: 'left',
                },
                {
                    text: `Order Date: ${params.date}\n\n`,
                    alignment: 'right',
                },
            ],
        },
        _ = {
            text: 'Order List',
        },
        orderTable = {
            table: {
                widths: ['5%', '50%', '30%', '15%'],
                body: [
                    ['', 'Product Name', 'Order Quantity', 'Accepted'],
                ],
            },
        },
    }

    await params.tableContents.forEach((val, idx) => {
        template.orderTable.table.body.push([ idx+1, val.name, val.qty, val.yes ? 'Y' : 'N/A' ])
    })

    return template
};

/*
@params: params: object {name:String, address:String, number:String, date:String, tableContents:Array[{name: String, qty: Number, Yes: Boolean }]}*/
async function createOrderPdf(params) {
    const printer = new PdfPrinter(docFonts)

    const docDefinition = {
        content: invoiceTemplate(params),
        styles: docStyles,
        footer = {
            text: 'This is a computer generated document and does not require a signature',
            style: 'footer'
        },

    }

    const doc = printer.createPdfKitDocument(docDefinition)
    doc.end();

    return doc
}