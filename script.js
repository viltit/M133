const baseURL = "http://sandbox.gibm.ch";
const lsProfession = 'profession';
const lsClass = 'class';


/*
    TODO
    - When the class is fetched from the local storage and we click on next week, the selected class in the dropdown is chosen for the next
    - loading animation

*/

$(function() {

    // fetch the date and get the week and year. We need to extend dayjs's functionality first
    dayjs.extend(window.dayjs_plugin_weekOfYear);
    var now = dayjs();

    // Get all professions from the server in order to have them in the drop-down menu
    fetchProfessions();

    // see if we have the profession and class in the local storage
    let professionID = localStorage.getItem(lsProfession);
    let classID = localStorage.getItem(lsClass);
    if (professionID != null && classID != null) {
        fetchClasses(professionID);
        fetchClassTable(classID, formatDate(now));
        // important: we need to set the selected profession and class, or the class will switch when the week button is pushed
        // TODO: This does not work
        $('#selectProfession').val(professionID);
        $('#selectClass').val(classID); 
        console.log(classID);
        console.log("Selected class id: ", $('#selectProfession').children("option:selected").val());
    }

    // When the user changes his drop-down selection, fetch the classes for the selected profession
    $('#selectProfession').change(() => {
        // delete old classses from dropdown:
        $('#selectClass').children().remove();
        // also delete existing table:
        $('#classTable').html("");
        let selected = $('#selectProfession').children("option:selected").val();
        // set the profession id in the local storage:
        localStorage.setItem(lsProfession, selected);
        fetchClasses(selected);
        // console.log($('#selectProfession').children("option:selected").text());
        // console.log(selected);

        // reset date to now:
        now = dayjs();
    });

    // When the user changes the class drop-down-selection, fetch the table for this class
    $('#selectClass').change(() => {
        // empty the class table in case he already exists
        $('#classTable').children().remove();
        let selected = $('#selectClass').children("option:selected").val();
        // set the class id in the local storage:
        localStorage.setItem(lsClass, selected);
        fetchClassTable(selected, formatDate(now));
    });

    // add event handlers to the week selection buttons. These buttons do not exist yet, but their parent element does:
    $('#selectDate').on('click', '#left', () => {
        // fade the exising table out
        // TODO: There should be a better way than to repeat this code on several places
        $('#classTable').fadeOut(200, () => {
            console.log("Fade out complete");
        });
        now = dayjs(now).subtract(1, 'week');
        let selected = $('#selectClass').children("option:selected").val();
        fetchClassTable(selected, formatDate(now));
        // and fade in again:
        $('#classTable').fadeIn(200, () => {
            console.log("Fade in complete");
        });
    });
    $('#selectDate').on('click', '#right', () => {
        $('#classTable').fadeOut(200);
        now = dayjs(now).add(1, 'week');  
        let selected = $('#selectClass').children("option:selected").val();
        fetchClassTable(selected, formatDate(now));
        $('#classTable').fadeIn(200);
    });
})


/**
 * Fetch all professions from "http://sandbox.gibm.ch" and append them to the #selectProfession Dropdown-Menu
 */
function fetchProfessions() {
    $.getJSON(baseURL + "/berufe.php")
        // we have the desired response -> add each profession to the selection list
        .done((data) => {
            $.each(data, (i, profession) => {
                $('#selectProfession').append('<option value="' + profession.beruf_id + '">' + profession.beruf_name + '</option>'); 
            });
        // deselect - if not, the first entry in the list counts as selected and does not react to change
        $('#selectProfession').val('');
        })
        // we have an error
        .fail((error) => {
            $('#message').append('<div class="alert alert-danger" role="alert">Die Verbingung zum Server konnte nicht hergestellt werden.</div>');
        });
}

/**
 * Fetch the classes for a specific profession
 * @param id: Identifier of the profession
 */
function fetchClasses(id) {
    const request = baseURL + "/klassen.php?" + "beruf_id=" + id;
    $.getJSON(request)
        // we have the desired response
        .done((data) => {

            // hide the dropdown so that we can use fade in
            $('#selectClass').hide();

            $.each(data, (i, schoolclass) => {
                $('#selectClass').append('<option value="' + schoolclass.klasse_id + '">' + schoolclass.klasse_longname + schoolclass.klasse_name + '</option>')
            });
            $('#selectClass').val('');
            $('#selectClass').fadeIn(200);
        })
        // we have an error
        .fail((error) => {
            $('#message').append('<div class="alert alert-danger" role="alert">Die Verbingung zum Server konnte nicht hergestellt werden.</div>');
        });
}


/** fetch the table for a given class 
 * @param id: Identifier of the class
 * @param date: A string representing a date in the form "ww-yyyy"
 */
function fetchClassTable(id, date) {
    const request = baseURL + "/tafel.php?" + "klasse_id=" + id + "&woche=" + date;
    console.log(request);
    $.getJSON(request)
        // we have the response
        .done((data) => {
            console.log(data);

            // hide the table so that we can fade it in later
            $('#classTable').hide();
            
            let weekAndYear = date.split("-");
            let week = weekAndYear[0];
            let year = weekAndYear[1];

            // TODO: It would be enough to create these once....
            let leftButton = '<button id="left" type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span></button>';
            let rightButton = '<button id="right" type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span></button>';
            let weekButton = '<button type="button" class="btn btn-default" aria-label="Left Align">' + 'Woche ' + week  + ' ' + year + '</button>';

            $('#selectDate').html(leftButton + weekButton + rightButton);
            
            if (data.length == 0) {
                // TODO: Why is the bootstrap style missing ?
                let message = '<div class="alert warning" role="alert">' +
                                'Keine Schule in dieser Woche (oder noch kein Stundenplan)</div>';
                $('#classTable').html(message);
                return;
            }

            // prepare table body
            let tableBody = $.map(data, (row) => {
                return '<tr><td>' + row.tafel_datum 
                    + '</td><td>' + row.tafel_wochentag 
                    + '</td><td>' + row.tafel_von 
                    + '</td><td>' + row.tafel_bis 
                    + '</td><td>' + row.tafel_lehrer 
                    + '</td><td>' + row.tafel_longfach 
                    + '</td><td>' + row.tafel_raum + '</td></tr>';
            // reduce the string array from map into one string
            }).reduce((result, value) => {
                return result + value 
            });

            // console.log(tableBody);
            let table =     '<table class="table">' +
                                '<thead class="thead-dark">' +
                                    '<tr>' + 
                                        '<th scope="col">Datum</th>' +
                                        '<th scope="col">Wochentag</th>' +
                                        '<th scope="col">Von</th>' +
                                        '<th scope="col">Bis</th>' +
                                        '<th scope="col">Lehrer</th>' +
                                        '<th scope="col">Fach</th>' +
                                        '<th scope="col">Raum</th>' +
                                    '</tr>' +
                                '</thead>' + 
                                '<tbody>' +
                                   tableBody + 
                                '</tbody>' +
                            '</table>';
            $('#classTable').html(table);
 
            $('#classTable').fadeIn(200);
        })
        // we have an error
        .fail((error) => {
            console.log(error);
            $('#message').append('<div class="alert alert-danger" role="alert">Die Verbingung zum Server konnte nicht hergestellt werden.</div>');
        });
}

/**
 * because it seems that dayjs can not format a date to "ww-yyyy", we need our own function here
 * @param date: A dayjs date object
 * @returns a string representing the date in the form "ww-yyyy"
 */
function formatDate(date) {
    let week = dayjs(date).week();
    let year = dayjs(date).year();
    return (week + "-" + year);
}