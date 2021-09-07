/*global
    $, window, document, alert, setTimeout, location
*/

"use strict";

var quote,
    quoteId,
    author,
    alphabet = ['null', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
    activeLetter = 0,
    count,
    session,
    spinner,
    gameEnded = false,
    isMobile = window.matchMedia("only screen and (max-width: 576px)"),
    urlParams = new URLSearchParams(window.location.search),
    quote_endpoint = "api/quote",
    google_endpoint = "auth/google",
    status_endpoint = "api/status",
    logout_endpoint = "api/logout",
    login_endpoint = "api/login",
    userRegisterURL = "api/user_register.php",
    userRecoverURL = "api/user_recover.php",
    submit_endpoint = "api/submit",
    solution_endpoint = "api/solution",
    facebookURL = "https://www.facebook.com/sharer/sharer.php?u=https://quotes.jovanilic.com/quotes.html",
    twitterURL = "https://twitter.com/intent/tweet?url=https://quotes.jovanilic.com/quotes.html";



checkUserStatus();

function checkUserStatus() {
    $.get(status_endpoint, (session) => {
        if (!session.error) {
            $("#session-username").text(session.username);
            $(".fa-user-tie").css("color", "#28a745");
            $("#user-button").attr("data-target", "#user-logout-dialog");
            $("#profile-button").prop("disabled", false);
        }
    });

    if (urlParams.has("quote")) {
        getQuote(quote_endpoint + "?quote=" + urlParams.get("quote"));
    } else {
        getQuote(quote_endpoint);
    }
}

function getQuote(url) {
    $.ajax({
        url: url, cache: false, success: function (result) {
            spinner = $(".spinner-border").remove();

            if (result.error) {

                // TODO different error messages
                if (result.error === "Invalid ID") {
                    $('#solution').text("No quotes found with id: " + urlParams.get("quote"));
                } else if (result.error === "No quotes returned") {
                    $('#solution').text("Wow! It appears that you have solved all the quotes there are. Well done.");
                } else {
                    $('#solution').text(result.error);
                }
                $("#copy-clipboard").prop("disabled", true);
                $("#facebook-link button").prop("disabled", true);
                $("#twitter-link button").prop("disabled", true);

            } else {

                quote = result.quote.quote;
                author = result.quote.author;
                quoteId = result.quote.link;

                $("#copy-clipboard").prop("disabled", false);

                $("#facebook-link").attr("href", facebookURL + "?quote=" + quoteId);
                $("#facebook-link button").prop("disabled", false);

                $("#twitter-link").attr("href", twitterURL + "?quote=" + quoteId);
                $("#twitter-link button").prop("disabled", false);

                // set link to right hand input
                $('#solution-id').val(quoteId);

                // Replace all double quotes and single quotes respectively
                quote = quote.replace(/&quot;/g, '"').replace(/&#39;/g, '\'');

                // Count represents the number of valid (scrambled) characters in the quote
                count = quote.replace(/[^a-z]/gi, '').length;

                // code below loops through quote and writes down the underscored sentence
                for (var i = 0; i < quote.length; i++) {
                    // get the character that is paired with the current letter in quote
                    var chars = quote.charAt(i).toLowerCase(),
                        // get the classIndex based on letter position in alphabet, this will ensure that all same letters have the same class
                        classIndex = alphabet.indexOf(chars);
                    // if it is a letter
                    if (chars.toUpperCase() != chars.toLowerCase()) {
                        // append underscores for every letter
                        $('#solution').append('<span class="underscores" name="letter' + classIndex + '">_</span>');
                    }
                    // if it is not a letter
                    else {
                        // append the character as is
                        $('#solution').append(chars);
                    }
                }

                highlightLetters(0);
            }

            $('#keyboard-focus').focus();

            // when clicked on a letter in sentence
            $('.underscores').click(function () {
                // store the position of the clicked character
                activeLetter = $(this).parent().children().index(this);
                // highlight all the letters of the same type
                highlightLetters(activeLetter);
                $('#keyboard-focus').focus();
            });
        }
    });
}

/*
*   JQuey events and click handlers
*/
$(document).ready(function () {

    // align rigth all dropdowns if on mobile
    if (isMobile.matches) {
        $(".dropdown-menu").addClass("dropdown-menu-right");
    }

    // this will display login or register dialog if parameters exists
    if (urlParams.has("login")) {
        $("#user-login-dialog").modal('show');
    } else if (urlParams.has("register")) {
        $("#user-register-dialog").modal('show');
    }

    // when clicked on a clear button
    $('#clear-button').click(function () {
        removeAllLetters();
        $('#keyboard-focus').focus();
    });

    // when clicked on a restart button
    $('#restart-button').click(function () {
        if (gameEnded) {
            var path = window.location.href;
            window.location.href = path.substring(0, path.indexOf('?'));
        } else {
            $("#solution").empty();
            spinner.appendTo("#solution");
            getQuote(quote_endpoint);
        }
    });

    // when clicked on a user-register link
    $(".user-register-link").click(function (e) {
        $(this).closest(".modal").modal("hide");
        e.preventDefault();
        $("#user-register-dialog").modal("show");
    });

    // when clicked on a user-login link
    $(".user-login-link").click(function (e) {
        $(this).closest(".modal").modal("hide");
        e.preventDefault();
        $("#user-login-dialog").modal("show");
    });

    // when clicked on a user-recover link
    $(".user-recover-link").click(function (e) {
        $(this).closest(".modal").modal("hide");
        e.preventDefault();
        $("#user-recover-dialog").modal("show");
    });

    // detect when any dialog is closed, and focus input
    $('.modal').on('hidden.bs.modal', function () {
        $('#quote-author').val('');
        $('#quote-text').val('');

        setTimeout(function () {
            $('#keyboard-focus').focus();
        }, 1);
    });

    // detect when any dropdown is closed, and focus input
    $(document).on('hidden.bs.dropdown', function () {
        setTimeout(function () {
            $('#keyboard-focus').focus();
        }, 1);
    });

    // detect when dialog is opened, and focus input
    $(document).on('shown.bs.modal', ".modal", function () {
        $(this).find('input:first').focus();
    });

    $(document).on("click", function (e) {
        if ($(e.target).parents(".modal").length == 0) {
            $("#keyboard-focus").focus();
        }
    });

    $("#copy-clipboard").click(function (event) {
        var copyInput = document.createElement("textarea");
        copyInput.style.position = 'fixed';
        copyInput.style.top = 0;
        copyInput.style.left = 0;
        copyInput.style.width = '2em';
        copyInput.style.height = '2em';
        copyInput.style.padding = 0;
        copyInput.style.border = 'none';
        copyInput.style.outline = 'none';
        copyInput.style.boxShadow = 'none';
        copyInput.style.background = 'transparent';

        copyInput.value = window.location.href;

        document.body.appendChild(copyInput);
        copyInput.focus();
        copyInput.select();

        document.execCommand("copy");
        document.body.removeChild(copyInput);

        showAlert("quote", "success", "Link coppied to clipboard.")
    });

    $("#keyboard-focus").on("input", function () {
        var key_pressed = this.value.toLowerCase();
        if (alphabet.includes(key_pressed)) {
            addLetter(key_pressed);
        }
        $(this).val("");
    });

    // capture TAB, BACKSPACE and other special characters with keydown event, as they can only be captured with this event
    $("#keyboard-focus").on("keydown", function (e) {
        // if regular or capital letter
        if (e.keyCode == 9) {
            // tab goes to next underscore charater
            nextLetter();
            // this ignores focus change
            return false;
        } else if (e.keyCode == 8) {
            // backspace adds underscore and moves one character back
            removeLetter();
            goBack();
            // this ignores browser previos page (or other default) function
            return false;
        } else if (e.keyCode == 32) {
            // space removes any character and add the underscore back
            removeLetter();
            goForth();
        } else if (e.keyCode == 37) {
            // left arrow goes back
            goBack();
        } else if (e.keyCode == 39) {
            // right arrow goes forth
            goForth();
        }
    });

    $('#logout').click(function () {
        $.get(logout_endpoint);
        location.reload();
    });

    /****************\
     * QUOTE UPLOAD *
    \****************/

    $('#quote-submit').submit(function () {
        // Validate a quote
        if ($('#quote-author').val().length < 2 || $('#quote-text').val().length < 10) {

            // validation failed
            showAlert("donate-quote", "danger", "Author name or quote too short.");
        } else {
            // add progress indicatior
            $('#quote-upload').html('<i class="fas fa-spinner fa-spin"></i> Upload');

            // Send the quote for verification
            $.ajax({
                cache: false,
                type: "POST",
                url: submit_endpoint,
                data: $(this).serialize(),
                dataType: "json",
                success: function (result) {
                    // remove progress indicatior
                    $('#quote-upload').html('Upload');
                    console.log(result);

                    if (result.error) {
                        showAlert("donate-quote", "danger", result.error);
                    } else {

                        // set url with new/old quote
                        var pathname = window.location.href;
                        pathname = pathname.substring(0, pathname.indexOf('?'));
                        var newQuoteURL = pathname + '?quote=' + result.id;

                        if (result.existed) {
                            showAlert("donate-quote", "warning", 'Quote already exists. Use this <a href="' + newQuoteURL +
                                '" class="alert-link">link</a> to play & share it.', true);
                        } else {
                            showAlert("donate-quote", "success", 'Quote uploaded. Click <a href="' + newQuoteURL +
                                '" class="alert-link">here</a> to open it.', true);
                        }

                    }
                }
            });
        }

        // prevent default behaviour
        return false;
    });



    /*************\
     * USER FORM *
    \*************/

    $("#login-username").on("keypress", function (e) {
        if (e.which == 13) {
            $("#login-password").focus();
        }
    });

    $("#login-password").on("keypress", function (e) {
        if (e.which == 13) {
            $("#login-button").click();
        }
    });

    $("#login-button").click(function () {

        var usernameFlag = $("#login-username")[0].validity.valid;
        var passwordFlag = $("#login-password")[0].validity.valid;

        if (usernameFlag && passwordFlag) {

            var postData = $("#login-username, #login-password").serialize();

            $.post(login_endpoint, postData, function (data) {
                if (data.login) {
                    location.href = "?quote=" + quoteId;
                }
                else {
                    showAlert("login", "danger", data);
                }
            });

            // prevent default behaviour
            return false;
        } else {
            showAlert("login", "danger", "Username or password not set.");
        }
    });

    $('#user-register-form').submit(function () {
        $.post(userRegisterURL, $(this).serialize(), function (data, status) {
            if (status == 'success' && data == 'User successfully registered. Verification email sent.') {
                $("#user-register-dialog").modal('hide');
                $("#user-login-dialog").modal('show');
                showAlert("login", "warning", data);
            } else {
                showAlert("register", "danger", data);
            }
        });

        // prevent default behaviour
        return false;
    });

    $('#user-recover-form').submit(function () {
        $.post(userRecoverURL, $(this).serialize(), function (data, status) {
            if (status == 'success' && data == 'Email sent.') {
                $("#user-recover-dialog").modal('hide');
                $("#user-login-dialog").modal('show');
                showAlert("login", "warning", data);
            } else {
                showAlert("recover", "danger", data);
            }
        });

        // prevent default behaviour
        return false;
    });

    /***************\
     * DONATE FORM *
    \***************/

    $('#donate').click(function () {
        var amount = $("#donate-amount option:selected").val();
        var currency = $("#donate-currency option:selected").val();
        var win = window.open('https://www.paypal.me/jovanilic/' + amount + currency, '_blank');
        win.focus();
    });
});

/*
*   functions
*/

// this highlights all the letters of the same type
function highlightLetters(index) {
    // get the letter from the "stripped" quote at index
    var temp = quote.replace(/[^a-z]/gi, '').charAt(index);
    // get the name attribute of the letters to be highlighted
    var name = 'letter' + alphabet.indexOf(temp.toLowerCase());

    $('.underscores').css('color', 'black');
    // remove highlight from all letters
    $('.underscores').css('textShadow', '');
    $('.underscores').attr('highlighted', '');
    // get all the letters of the same type
    var elements = document.getElementsByName(name);
    for (var i = 0; i < elements.length; i++) {
        // add highlight to each letter of the same type
        //elements[i].style.backgroundColor = highlightColor;
        elements[i].style.textShadow = '0 0 10px #000000';
        $(elements[i]).attr('highlighted', 'yes');
    }
    $('.underscores:eq(' + index + ')').css('textShadow', '0 0 10px #B31B1B');
}

// this changes the highlighted letters with the one provided
function addLetter(letter) {
    // get all letters from underscores group
    var elements = document.getElementsByClassName('underscores');
    // cycle through them and change the higlighted ones
    for (var i = 0; i < elements.length; i++) {
        if ($(elements[i]).attr('highlighted') === 'yes') {
            elements[i].innerHTML = letter;
        }
    }
    // check if the sentence was guessed
    checkEnd(quoteId); // TODO check only on finished sentence
    nextLetter();
}

// this removes the selected letters and puts '_' instead
function removeLetter() {
    // get all letters from underscores group
    var elements = document.getElementsByClassName('underscores');
    // cycle through them and change the higlighted ones
    for (var i = 0; i < elements.length; i++) {
        if ($(elements[i]).attr('highlighted') === 'yes') {
            elements[i].innerHTML = '_';
        }
    }
}

// this focuses the next unset letter
function nextLetter() {
    // set active letter to the next character
    activeLetter++;
    // check will flag if full loop was done without finding '_' character
    var check = activeLetter - 1;
    // find next '_' character
    while ($('.underscores:eq(' + activeLetter + ')').text() !== '_') {
        // go to the next character if '_' not found in the current character
        activeLetter++;
        // reset active letter if necessary
        if (count <= activeLetter)
            activeLetter = 0;
        // if reached full circle break out of the loop
        if (check == activeLetter) {
            // focus on next character
            activeLetter++;
            // if it's the last character focus on the first instead
            if (count <= activeLetter)
                activeLetter = 0;
            break;
        }
    }
    // highlight the next characters
    highlightLetters(activeLetter);
}

// go one character backward
function goBack() {
    // if not already at the begining
    if (activeLetter > 0)
        activeLetter--;
    else
        activeLetter = count - 1;
    highlightLetters(activeLetter);
}

// go one character forward
function goForth() {
    // if not already at the end
    if (activeLetter < count - 1)
        activeLetter++;
    else
        activeLetter = 0;
    highlightLetters(activeLetter);
}

// this clears all the letters from the guess sentence
function removeAllLetters() {
    var elements = document.getElementsByClassName('underscores');
    for (var i = 0; i < elements.length; i++) {
        elements[i].innerHTML = '_';
    }
}

// check if the quote is guessed
function checkEnd(id) {
    // get original text
    var check = $('#solution').text().trim();

    // compare the guess to the orginal
    if (check.toLowerCase() === quote.toLowerCase()) {

        gameEnded = true;
        var alertMessage;

        // mark the completion in database
        $.get(solution_endpoint + "?quote=" + quoteId, function (response) {
            if(response.success) {
                alertMessage = response.success;
            // if (response == "success" && data == "User soulution confirmed") {
            //     alertMessage = "Congratulations! Quote added to your timeline.";
            // } else if (status == "success" && data == "Quote already solved") {
            //     alertMessage = "Congratulations! You solved the quote.";
            } else {
                // alertMessage = "Congratulations! Login to track what quotes you solved, view your stats and much more!";
                alertMessage = 'Something went wrong.'
            }
        });

        // some nice animations for the end
        $("#controls").fadeTo('medium', 0);
        $("#solution-card").fadeTo('medium', 0);

        setTimeout(function () {
            $('#solution-card').remove();
            $('#quote-end').show();
            $('#quote-end p').hide();
            $('#quote-end footer').hide();
            $('#quote-end p').text(quote);
            $('#quote-end footer').text(author);
            $('#quote-end p').fadeTo(2000, 1);

            $('#clear-button').prop('disabled', true);
        }, 750);

        setTimeout(function () {
            $('#quote-end footer').fadeTo(2000, 1);
        }, 1300);

        setTimeout(function () {
            $("#controls").fadeTo(1500, 1);
            showAlert("quote", "success", alertMessage);
        }, 2500);
    }
}

function showAlert(id, type, data, persist) {
    $("#" + id + "-alert").html(data);
    $("#" + id + "-alert").attr("class", "alert alert-" + type);
    $("#" + id + "-alert").show();

    if (!persist) {
        setTimeout(function () {
            $("#" + id + "-alert").hide();
        }, 2500);
    }
}