#!/usr/bin/env node

var z = require('zombie')
  , fs = require('fs')
  , _ = require('underscore')

function error(e) { console.log(e) }

function getCredentials(next) {

    fs.readFile('.credentials', function(err, data) {

        if (err) {
            next(err)
            return
        }

        var pair = data.toString('ascii').split('\n')

        if (pair.length < 2) {
            next('Wrong credentials file.')
            return
        }

        next(null, {username: pair[0], password: pair[1]})
    })
}

function log(br) {
    console.log(br.location._url.href)
    console.log(br.statusCode)
    //console.log(br.html())
}

function elemExists(br, query) {
    return br.query(query) !== undefined
}

function openLoginPage(next) {

    var br = new z()//{debug: true})
      , stages = [
            {
                name: 'start',
                action: function(br) {
                    br.visit('https://28degrees-online.gemoney.com.au/')
                }
            }
          , {
                name: 'intermediate',
                urlPart: 'https://28degrees-online.gemoney.com.au/access/do?',
                check: function(br) {
                    return true
                },
                action: function(br) {
                    if (br.html().indexOf("window.location = '/access/login'") !== -1) {
                        br.location = '/access/login'
                    }
                }
            }
          , {
                name: 'login',
                urlPart: 'https://28degrees-online.gemoney.com.au/access/login',
                count: 0,
                check: function(br) {
                    /*var error = elemExists(br, ':contains("There seems to be a problem")')
                    if (error) {
                        exit = true
                        console.log(br.html())
                        return false
                    }

                    if (_exit) {
                        console.log(br.html())
                        exit = true
                    }*/

                    this.count += 1
                    if (this.count > 1) { // This page have been displayed more than once, login error
                        console.log('Error logging in. Check your username/password in .credentials file')
                        return false
                    }

                    return br.query('input[name="SUBMIT"]') !== undefined
                },
                action: function(br) {
                    console.log('Logging in...')
                    br.document.getElementById('AccessToken_Username').value = creds.username
                    br.document.getElementById('AccessToken_Password').value = creds.password
                    br.pressButton('[name="SUBMIT"]')
                }
            }
          , {
                name: 'home',
                urlPart: 'https://28degrees-online.gemoney.com.au/wps/myportal/ge28degrees/public/home',
                check: function(br) {
                    return elemExists(br, ':contains("My Recent Transactions")')
                },
                action: function(br) {
                    var h = br.query('h2:contains("My Recent Transactions")')

                    if (!h) {
                        console.log('Cannot find "My Recent Transactions" section on home page. Requesting exit.')
                        this.exit = true
                        return
                    }

                    var link = h.parentNode.parentNode.querySelector('a[name="Wrapper_lnMoreInfo"]')
                    if (!link) {
                        console.log('Cannot find link "MORE..." in "My Recent Transactions" section. Requesting exit.')
                        this.exit = true
                        return
                    }

                    br.fire('click', link)
                }
            }
          , {
                name: 'transactions',
                urlPart: 'https://28degrees-online.gemoney.com.au/wps/myportal/ge28degrees/public/account/transactions/',
                check: function(br) {
                    return elemExists(br, 'tr[name="DataContainer"]')
                },
                action: function(br) {

                    var rows = br.queryAll('tr[name="DataContainer"]')
                      , isNextButtonVisible = elemExists(br, 'a[name="nextButton"]')

                    console.log('Rows: ' + rows.length)
                    console.log('Dates: ' + br.queryAll('[name="Transaction_TransactionDate"]').length)
                    console.log('Dates 2: ' + br.queryAll('td', rows[0]).length)

                    _(rows).each(function(row) {

                        var cells = row.querySelectorAll('td')
                          , date
                          , name
                          , desc
                          , amt

                        _(cells).each(function(cell) {


                            if (cell.childNodes.length !== 0 &&
                                cell.childNodes[0].tagName.toLowerCase() === 'span') {

                                var span = cell.childNodes[0]

                                //console.log('span:' + span.attributes.getNamedItem('name').value)
                                //console.log('span:' + span.innerHTML)

                                switch (span.attributes.getNamedItem('name').value) {
                                    case 'Transaction_TransactionDate': date = span.innerHTML;
                                    case 'Transaction_CardName': name = span.innerHTML;
                                    case 'Transaction_TransactionDescription': desc = span.innerHTML;
                                    case 'Transaction_Amount': amt = span.innerHTML;
                                }
                            }
                        })

                        //console.log(row.innerHTML)
                        //console.log(date.innerHTML + ':' + name.innerHTML + ':' + desc.innerHTML + ':' + amt.innerHTML)

                    })

                    if (isNextButtonVisible) {
                        console.log('Some records available, going further back...')
                        var link = br.query('a[name="nextButton"]')
                        console.log('Link: ' + link.attributes.getNamedItem('href').value)
                        br.fire('click', link)
                    } else {
                        console.log('Looks like we have reached the end of transactions. Requesting exit.')
                        this.exit = true
                    }
                }
            }
        ]


    br.on('loaded', function(br) {

        var url = br.location._url.href

        console.log(url)
        stage = _(stages).find(function(stage) {
            return url.indexOf(stage.urlPart) === 0
        })

        if (!stage || !stage.check.call(stage, br)) {
            return
        } else {
            stage.action.call(stage, br)
            if (typeof stage.exit !== 'undefined' && stage.exit) {
                console.log('Stage "' + stage.name + '" requested exit, exiting...')
                return
            }
        }
    })

    stages[0].action(br)

    /*
    br.clickLink('My Account', function(err, br, status) {

        if (err) {
            next(err)
            return
        }

        br.clickLink("Transactions", function(err, br, status) {

            if (err) {
                next(err)
                return
            }

            //log(br)
            console.log(br.html())

        })
    })*/

    br.on('done', function() {
        console.log('Done!')
        console.log(arguments)
    })

    /*
    br.on('error', function() {
        console.log('Error!')
        console.log(arguments)
    })
    */
/*
    br.visit('https://28degrees-online.gemoney.com.au/', function(e, br) {

        if (e) {
            next(e)
            return
        }

        br.visit('https://28degrees-online.gemoney.com.au/access/login', function(e, br) {

            if (e) {
                next(e)
                return
            }

            br.document.getElementById('AccessToken_Username').value = creds.username
            br.document.getElementById('AccessToken_Password').value = creds.password

            console.log('PRESSING')
            br.pressButton('[name="SUBMIT"]', function(err, br) {

                if (err) {
                    next(err)
                    return
                }

            })

            //br.wait(isLoaded, function() {

            //})



        })


    })*/
}

var creds = null

getCredentials(function(err, data) {

    if (err) {
        error(err)
        return
    }

    creds = data
    openLoginPage(function(err) {
        console.log(err)
    })
})
