/*globals
    $, alert, location, window,
*/

$(function () {
    "use strict";

    var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
        isMobile = window.matchMedia("only screen and (max-width: 576px)"),
        profile_endpoint = "api/profile",
        userUpdateInfoURL = "user_update_info.php",
        userUpdatePasswordURL = "user_update_password.php";

    $.get(profile_endpoint, (response) => {

        var last_year;

        if (!response.error) {

            // timeline
            $("#timeline h3").remove();
            response.forEach((item) => {

                var timeline_item = $.parseHTML($('#timeline_template').html()),
                    content,
                    timeline_color,
                    timeline_icon,
                    tooltip,
                    date = new Date(item.timestamp.substr(0, 10));

                $(timeline_item).find("#timeline_link").val(item.link);

                $(timeline_item).find(".timeline_month").text(months[date.getMonth()]);
                $(timeline_item).find(".timeline_day").text(date.getDate());

                if (last_year !== date.getFullYear()) {
                    $(".timeline").append('<div class="group"><span class="year">' + date.getFullYear() + '</span></div>');
                }

                last_year = date.getFullYear();


                if (item.author) {
                    content = item.quote;
                    $(timeline_item).find(".timeline_author > i").text(item.author);
                } else {
                    content = "User <i>" + item.username + "</i> registered to the Game of Quotes system.";
                    $(timeline_item).find(".timeline_author").remove();

                    // for profile
                    $('#username').val(item.username);
                    $('#email').val(item.email);

                    $('#update-username').val(item.username);
                    $('#update-email').val(item.email);

                    // stats
                    $("#quotes_solved").text(item.solved);
                    $("#quotes_donated").text(item.uploaded);
                }

                $(timeline_item).find("#timeline_content").html(content);

                switch (item.mark) {
                    case "quote":
                        timeline_color = "blue";
                        timeline_icon = "unlock-alt";
                        tooltip = "Quote solved & unlocked";
                        break;
                    case "user":
                        timeline_color = "orange";
                        timeline_icon = "users";
                        tooltip = "Registration complete";
                        break;
                    case "upload":
                        timeline_color = "red";
                        timeline_icon = "gift";
                        tooltip = "You donated this quote";
                        break;
                    case "donate":
                        timeline_color = "green";
                        timeline_icon = "donate";
                        tooltip = "You made a donation";
                        break;
                }

                $(timeline_item).find(".timeline_date").addClass("date_" + timeline_color);
                $(timeline_item).find(".timeline_quote").css("borderColor", timeline_color);
                $(timeline_item).find(".timeline_icon").addClass("fa-" + timeline_icon);
                $(timeline_item).find(".timeline_tooltip").attr("title", tooltip);

                // add timeline item to the last added timeline box
                $(".timeline .group").last().append(timeline_item);
            });

            // click listeners have to be defined here, after html is added to DOM

            // handle timeline quote link click
            $('.timeline_link').click(function (e) {
                window.location.replace("quotes.html?quote=" + $(e.target).siblings("#timeline_link").val());
            });
        } else {
            $(".timeline").remove();
        }

    });

    // handle dialog closing
    $('#user-update-dialog').on('hidden.bs.modal', function () {
        $('#update-info').val(' ');
    });

    // set both colums to save height
    $('a[href="#profile"]').on('shown.bs.tab', function () {
        if (!isMobile.matches) {
            $('#user-card .card-body').innerHeight($('#password-card .card-body').outerHeight());
        }
    })

    // handle user update
    $('#user-update').click(function () {
        $.post(userUpdateInfoURL, $(this).serialize(), function (data) {
            alert(data);// TODO
        });

        // prevent default behaviour
        return false;
    });

    // handle checkbox click
    $('.update-checkbox').change(function () {
        // get input field
        var $input = $(this).closest('div').children('input');
        if ($(this).is(":checked")) {
            $input.prop('disabled', false);
        } else {
            $input.prop('disabled', true);
        }
    });

    // handle password update
    $('#change-password').click(function () {
        $.post(userUpdatePasswordURL, $('#change-password-form').serialize(), function (data, status) {
            if (status === 'success' && data === 'Password successfully updated!') {
                location.href = 'quotes.html?login=true';
            } else {
                $('#change-alert').removeClass();
                $('#change-alert').addClass('alert alert-danger');
                $('#change-alert-text').append('<br>' + data);
            }
        });
    });

    // this will remember (put in url) what tab was selected
    $('.nav-tabs li.tab').click(function () {
        window.history.pushState('stateObject', 'Title', 'profile?' + $(this).find('a').text().trim().toLowerCase());
    });

    // this will open a tab is selection was remembered in url
    if (/[?]stats/.test(location.search)) {
        $('a[href="#stats"]').tab('show');
    } else if (/[?]timeline/.test(location.search)) {
        $('a[href="#timeline"]').tab('show');
    } else if (/[?]achievements/.test(location.search)) {
        $('a[href="#achievements"]').tab('show');
    } else {
        $('a[href="#profile"]').tab('show');
    }
});
