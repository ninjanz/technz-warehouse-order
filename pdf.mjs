import PdfPrinter from 'pdfmake';

const docFonts = {
    Roboto: {
        normal: 'fonts/Roboto-Regular.ttf',
        bold: 'fonts/Roboto-Medium.ttf',
        italics: 'fonts/Roboto-Italic.ttf',
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

    const template = [
        {
            text: 'NZ Curry House @ Plastic Supplies',
            style: ['header', 'title'],
        },
        {
            columns: [
                {
                    text: `Order Form for ${params.name}\n${params.address}\n`,
                    width: '30%',
                },
            ],
        },
        {
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
        {
            text: 'Order List',
        },
        {
            table: {
                widths: ['5%', '50%', '30%', '15%'],
                body: [
                    ['', 'Product Name', 'Order Quantity', 'Accepted'],
                ],
            },
        },
    ]
    // ONLY IF THE LEN IS GREATER THAN 0
    let x = 1
    if (params.stock.length > 0) {
        await params.stock.forEach((val) => {
            template[4].table.body.push([x++, val.SalesItemLineDetail.ItemRef.name, val.Qty, 'Y'])
        })
    }

    if (params.nostock.length > 0) {
        await params.nostock.forEach((val) => {
            template[4].table.body.push([x++, val.name, val.qty, 'N'])
        })
    }

    return template
};

/*
@params: params: object {name:String, address:String, number:String, date:String, tableContents:Array[{name: String, qty: Number, Yes: Boolean }]}*/
async function createOrderPdf(params) {
    const printer = new PdfPrinter(docFonts)

    const docDefinition = {
        content: invoiceTemplate(params),
        styles: docStyles,
        footer: {
            text: 'This is a computer generated document and does not require a signature',
            style: 'footer'
        },

    }

    const doc = printer.createPdfKitDocument(docDefinition)
    doc.end();

    return doc
}


export { createOrderPdf }