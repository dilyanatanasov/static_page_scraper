const cheerio = require('cheerio')
const axios = require('axios')
const xl = require('excel4node');

axios.get('https://www.ok-power.de/fuer-strom-kunden/anbieter-uebersicht.html').then((response) => {
        // Take the websites contents
        const dataTable = []
        const $ = cheerio.load(response.data)

        //Create a new sheet and set style
        var wb = new xl.Workbook();
        var ws = wb.addWorksheet('Sheet 1');
        var style = wb.createStyle({
          font: {
            color: '#000000',
            size: 12,
          }
        })

        // Set the first row
        let columnNames = ["Company","Address","Phone","Fax","Email","Contact Person","Website"];
        for(let i = 1; i <= 1; i++){
           for(let j = 1; j <= 7; j++){
             ws.cell(i, j )
             .string(columnNames[j - 1])
             .style(style)
             .style({font: {bold: true}})
           }
        }

        // Scrape for the table elements we need
        const urlElems = $('div.ce_table.anbieter.block')
        for (let i = 0; i < urlElems.length; i++) {
            let companyName = $(urlElems[i]).find('tr td.col_0')[0]
            companyName = $(companyName).text()
            let street = $(urlElems[i]).find('tr td.col_0')[2]
            let cityWithZip = $(urlElems[i]).find('tr td.col_0')[3]
            let address = $(street).text() + $(cityWithZip).text()
            let phone = $(urlElems[i]).find('tr td.col_1')[2]
            phone = $(phone).text()
            
            let fax,
                email,
                contactPerson,
                website

            // Make checks for missing elements, non needed data and arrange table values into vars
            for(let j = 3; j <= 7; j++){
              compare = $(urlElems[i]).find('tr td.col_1')[j]
              compareStr = $(compare).text()
              if(compareStr != ""){
                if(compareStr.match(/www/g)){
                  website = compareStr
                }else if(compareStr.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi)){
                  email = compareStr.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi)[0]
                }else if(compareStr.match(/Fax/g)){
                  fax = compareStr.match(/\d.*/g)[0]
                }else if(compareStr.match(/Tel/g)){
                  phone += (compareStr.match(/\d.*/g)) ? " " + compareStr.match(/\d.*/g)[0] : ""
                }else if(compareStr.match(/Fax/g) == null || compareStr.match(/Tel/g) == null || compareStr.match(/www/g) == null || compareStr.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi) == null || compareStr.match(/Ansprechpartner:(.*)/) || compareStr.match(/Absprechpartnerin:(.*)/) || compareStr.match(/Kontaktperson:(.*)/)){
                  contactPerson = compareStr.replace('\n','')
                  if(compareStr.match(/Ansprechpartner:(.*)/)){
                    contactPerson = contactPerson.match(/Ansprechpartner:(.*)/)[1]
                  }else if(compareStr.match(/Absprechpartnerin:(.*)/)){
                    contactPerson = contactPerson.match(/Absprechpartnerin:(.*)/)[1]
                  }else if(compareStr.match(/Kontaktperson:(.*)/)){
                    contactPerson = contactPerson.match(/Kontaktperson:(.*)/)[1]
                  }else{
                    contactPerson = contactPerson
                  }
                }
              }
            }

            // Format the phones if there are more than one
            phone = phone.replace('\n','')
            if(phone.match(/\d.*/g) == null){
              phone = ''
            }else{
              phone = phone.match(/\d.*/g)
              let concat = ""
              let stop = 1
              if(phone.length > 1){
                phone.forEach(function (arrayItem) {
                  if(phone.length == stop){
                    concat = concat + arrayItem
                  }else{
                    concat = concat + arrayItem + " | "
                  }
                  stop++
                });
              }else{
                concat = phone[0]
              }
              phone = concat
            }
            
            // Fill array with table arranged table elements
            dataTable.push({
              companyName : companyName,
              address: address,
              phone: (phone == null) ? '' : phone,
              fax: (fax == null) ? '' : fax,
              email: (email == null) ? '' : email,
              contactPerson: (contactPerson == null) ? '' : contactPerson.trim(),
              website: (website == null) ? '' : website
            })
        }   

        //Fill rows of sheet with data
        if(dataTable){
            let i = 2
            dataTable.forEach(function (arrayItem) {
              ws.cell(i, 1 )
             .string(arrayItem.companyName)
             .style(style);

             ws.cell(i, 2 )
             .string(arrayItem.address)
             .style(style);

             ws.cell(i, 3 )
             .string(arrayItem.phone)
             .style(style);

             ws.cell(i, 4 )
             .string(arrayItem.fax)
             .style(style);

             ws.cell(i, 5 )
             .string(arrayItem.email)
             .style(style);

             ws.cell(i, 6 )
             .string(arrayItem.contactPerson)
             .style(style);

             ws.cell(i, 7 )
             .string(arrayItem.website)
             .style(style);

             i++
          })
        }

        // Write the data into the file
        wb.write('DataExport.xlsx')
})