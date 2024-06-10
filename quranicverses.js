var selected_surah;
var userno = 0;
var signup=0;

function fetchOldVerses(url) {
    console.log("hhhhiiyft")
    var surahNo;
    if (url.includes("surahbookmark")) {
        // Extract surah number from "surahbookmark/surahno/ayatno"
        var parts = url.split('/');
        surahNo = parts[4]; // Get the second part after splitting
        // console.log("part 0:"+parts[0]+"part 1:"+parts[1]+"part 2:"+parts[2]+"part 3:"+parts[3]+"part 24:"+parts[4]+"part 5:"+parts[5])
    } else {
        // Extract surah number directly
        surahNo = url.split('/').pop(); // Get the last part after splitting
    }
    console.log("new surah no:"+surahNo)
    var xhr_arabic ;
    var xhr = new XMLHttpRequest();
    selected_surah=surahNo;
    xhr.open('GET', url, true);
    xhr_arabic = new XMLHttpRequest()
    xhr_arabic.open('GET', 'http://localhost:3000/surah/' + surahNo, true);
    console.log('Before sending request to:', url);
    var parsedResponse;
    xhr.onreadystatechange = function() {
        console.log('Ready state:', xhr.readyState);
        if (xhr.readyState === 4) {
            console.log('Request to', url, 'completed');
            if (xhr.status === 200) {
                console.log("Received response:", xhr.responseText);
                parsedResponse = JSON.parse(xhr.responseText);
                console.log('Parsed response:', parsedResponse);
            }
            if(url.includes("favourites")) {
                console.log("ggggg")
                console.log(parsedResponse);
                DisplayFavouriteList(parsedResponse);
            }
            else{
                xhr_arabic.send();
            }}};
    xhr_arabic.onreadystatechange = function() {
        console.log('Ready state:', xhr_arabic.readyState);
        if (xhr_arabic.readyState === 4) {
            console.log('Request to', 'http://localhost:3000/surah/' + surahNo, 'completed');
            if (xhr_arabic.status === 200) {
                console.log("Received response:", xhr_arabic.responseText);
                try {
                    var parsedResponse_arabic = JSON.parse(xhr_arabic.responseText);
                    if(url.includes("urdu") ){
                        DisplayVersesWithTranslation(parsedResponse_arabic, parsedResponse,"urdu");
                    }
                    else if( url.includes("eng")){
                        DisplayVersesWithTranslation(parsedResponse_arabic, parsedResponse,"eng");
                    }
                    else if(url.includes("surah")) {
                        DisplayVerses(parsedResponse_arabic,url);
                    }
                    else if(url.includes("word")) {
                        DisplayWordbyWord(parsedResponse_arabic,parsedResponse);
                    }
                    else if(url.includes("surahbookmark"))
                        { console.log("llll")
                            DisplayVerses(parsedResponse_arabic,url);
                        }
                } 
                catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            } else {
                console.error('Request failed with status:', xhr.status);
            }}};
    xhr.send();
}

function DisplayVerses(parsedResponse, url) {
    console.log('Parsed response:', parsedResponse);
    var verseContainer = document.getElementById('verse-container');
    verseContainer.innerHTML = '';
    verseContainer.style.display = "block";
    parsedResponse.forEach(verse => {
        var arabicParagraph = document.createElement('p');
        arabicParagraph.textContent = verse.text;
        arabicParagraph.style.fontSize = '24px';
        arabicParagraph.style.textAlign = 'right';
        arabicParagraph.style.fontWeight = 'bolder';
        arabicParagraph.style.margin = '15px';

        // Assign ID based on surahNo and ayatNo
        var surahNo = verse.surahNo;
        var ayatNo = verse.ayatNo;
        var surahName = verse.surahName;
        arabicParagraph.id = `surah${surahNo}_ayat${ayatNo}`;

        // Store surahNo and ayatNo in data attributes
        arabicParagraph.dataset.surahNo = surahNo;
        arabicParagraph.dataset.ayatNo = ayatNo;
        arabicParagraph.dataset.surahName = surahName;

        // Add click event listener to each verse
        arabicParagraph.addEventListener('click', (event) => {
            const clickedElement = event.target;
            const surahNo = clickedElement.dataset.surahNo;
            const ayatNo = clickedElement.dataset.ayatNo;
            const surahName = clickedElement.dataset.surahName;
            showBookmarkPopup(surahName, surahNo, ayatNo);});
        // Highlight and scroll to the verse if it's in the bookmark URL
        // Highlight and scroll to the verse if it's in the bookmark URL
        if (url.includes("surahbookmark") && ayatNo == getAyatNoFromURL(url)) {
            // Make the verse temporarily red
            arabicParagraph.style.color = 'red';
            setTimeout(() => {
                arabicParagraph.style.color = ''; // Reset color
            }, 3000); // 3000 milliseconds = 3 seconds
            // Scroll to the verse
            setTimeout(() => {
                arabicParagraph.scrollIntoView({ behavior: 'smooth' });
            }, 100);}
        // Append a horizontal rule
        var hr = document.createElement('hr');
        verseContainer.appendChild(arabicParagraph);
        verseContainer.appendChild(hr);});
}

// Function to extract ayat number from the URL
function getAyatNoFromURL(url) {
    const parts = url.split('/');
    return parts[parts.length - 1]; // Last part of the URL
}

function showBookmarkPopup(surahName, surahNo, ayatNo) {
    // Create the popup box
    console.log("firstcalling" + surahNo + "ayat" + ayatNo);
    var popup = document.createElement('div');
    popup.id = 'bookmark-popup';
    popup.style.position = 'fixed'; // Fixed positioning for viewport-relative positioning
    popup.style.top = '50%'; // Center vertically
    popup.style.left = '50%'; // Center horizontally
    popup.style.transform = 'translate(-50%, -50%)'; // Centering trick
    popup.style.background = '#fff';
    popup.style.border = '1px solid #ccc';
    popup.style.borderRadius = '10px';
    popup.style.padding = '10px';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '1000';
    // Create the content of the popup box
    var bookmarkIcon = document.createElement('span');
    bookmarkIcon.innerHTML = '🔖 Add to bookmarks';
    bookmarkIcon.style.cursor = 'pointer';
    bookmarkIcon.addEventListener('click', () => {
        console.log("calling" + surahNo + "ayat" + ayatNo);
        addToBookmarks(surahName, surahNo, ayatNo);
        hideBookmarkPopup();});

    var closeButton = document.createElement('span');
    closeButton.innerHTML = '✖';
    closeButton.style.float = 'right';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', hideBookmarkPopup);

    popup.appendChild(closeButton);
    popup.appendChild(bookmarkIcon);

    // Add the popup to the body
    document.body.appendChild(popup);
}

function hideBookmarkPopup() {
    var popup = document.getElementById('bookmark-popup');
    if (popup) {
        popup.parentNode.removeChild(popup);}
}

async function addToBookmarks(surahName, surahNo, ayatNo) {
    var surahNames = ["سورَةُ الكَوثَر", "سورَةُ العَصْر", "سورَةُ النـَّصر", "سورَةُ قـُرَيْش", "سورَةُ الفَاتِحَة", "سورَةُ القـَدر"];
    try {
        const response = await fetch(`http://localhost:3000/bookmarks/${encodeURIComponent(surahNames[surahNo])}/${surahNo}/${ayatNo}/${userno}`, {
            method: 'POST'});
        if (response.ok) {
            alert('Bookmark added successfully!');
        } else {
            const error = await response.json();
            alert(`Error adding bookmark: ${error.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while adding the bookmark.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Array of surah names
    var surahNames = ["سورَةُ الكَوثَر", "سورَةُ العَصْر", "سورَةُ النـَّصر","سورَةُ قـُرَيْش",">سورَةُ الفَاتِحَة","سورَةُ القـَدر" ];
    // Select all elements with class 'bi-heart' (heart icons)
    var heartIcons = document.querySelectorAll('.bi-heart');
    // Loop through each heart icon
    heartIcons.forEach(function(heartIcon, index) {
        // Add click event listener to each heart icon
        heartIcon.addEventListener('click', function(event) {
            // Generate the URL dynamically based on the index and surah name
            var url = `http://localhost:3000/favourites/surah/${index + 1}/${encodeURIComponent(surahNames[index])}/${userno}`;
            // Call the heart function with the generated URL and the event
            heart(url, event);});});}
);

function toggleHeartColor(element) {
    var currentFill = element.getAttribute('fill');
    if (currentFill === 'black') {
        element.setAttribute('fill', 'red');
    } else {
        element.setAttribute('fill', 'black');}}

function heart(url, event) {
    toggleHeartColor(event.target);
    // Make the POST request to add to favorites
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("Surah added to favorites");
        } else if (xhr.readyState === 4) {
            console.error("Failed to add surah to favorites");}};
    xhr.send();
}

function DisplayFavouriteList(parsedResponse) {
    console.log("Displaying favourite list");
    document.getElementById('containerfavourites').style.display = 'block';
    const container = document.getElementById('favourites_container');
    container.innerHTML = '';
    parsedResponse.forEach(fav => {
        const surahElement = document.createElement('div');
        surahElement.className = 'favorite-surah';
        surahElement.style.marginBottom = '10px';
        surahElement.style.border = '1px solid #ccc'; 
        surahElement.style.padding = '10px'; 
        surahElement.style.borderRadius = '5px'; 
        surahElement.style.position = 'relative'; 
        surahElement.style.cursor = 'pointer'; 
        surahElement.setAttribute('onclick', `direct_surahs('http://localhost:3000/surah/${fav.surahNo}')`);
        const surahNoElement = document.createElement('p');
        surahNoElement.textContent = `Surah No: ${fav.surahNo}`;
        const surahNameElement = document.createElement('p');
        surahNameElement.textContent = `Surah Name: ${fav.surahName}`;
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.id = `close-${fav.surahNo}`;
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = (event) => {
            event.stopPropagation();
            closeFavourite(surahElement); 
            removefavourite(`http://localhost:3000/closefavourite/${fav.surahNo}`);};
        surahElement.appendChild(closeButton);
        surahElement.appendChild(surahNoElement);
        surahElement.appendChild(surahNameElement);
        // Add a horizontal rule
        const hrElement = document.createElement('hr');
        surahElement.appendChild(hrElement);
        container.appendChild(surahElement);});}

function closeFavourite(surahElement) {
    surahElement.style.display = 'none';
}
function closeFavourites() {
    document.getElementById('containerfavourites').style.display = 'none';
}
function DisplayVersesWithTranslation(parsedResponse_arabic,parsedResponse,translation)
{
    console.log('Parsed response:', parsedResponse);
    console.log('Parsed response:', parsedResponse_arabic);
    console.log("containername:"+translation)
    var urduverseContainer = document.getElementById('verse-container'+translation);
    urduverseContainer.innerHTML = '';
    urduverseContainer.style.display = "block";
    console.log(parsedResponse)
    for (var i = 0; i < parsedResponse.length; i++) {
        var arabicParagraph = document.createElement('p');
        var urduParagraph = document.createElement('p');
        arabicParagraph.textContent = parsedResponse_arabic[i].text;
        urduParagraph.textContent = parsedResponse[i].text;
        urduParagraph.style.fontSize = '24px';
        urduParagraph.style.textAlign = 'right';
        urduParagraph.style.fontWeight = 'bolder';
        urduParagraph.style.margin = '15px';
        urduParagraph.style.color = 'green';
        arabicParagraph.style.fontSize = '24px';
        arabicParagraph.style.textAlign = 'right';
        arabicParagraph.style.fontWeight = 'bolder';
        arabicParagraph.style.margin = '15px';
        var hr = document.createElement('hr');
        arabicParagraph.appendChild(hr);
        urduverseContainer.appendChild(arabicParagraph);
        urduverseContainer.appendChild(urduParagraph);
    }
} 

function Names(){
    document.getElementById("maincontainer").style.display = "none";
    document.getElementById("Container_namesOfAllah").style.display = "block";
    document.getElementsByClassName("above_mode")[0].style.display = "none";
    document.getElementsByClassName("above_mode")[1].style.display = "none";
    document.getElementsByClassName("above_mode")[2].style.display = "none";
    document.getElementById('Container_Duas').style.display="none";
}

function displayVersesWithUrdu(ayats) {
    var verseContainer = document.getElementById('verse-containerurdu');
    verseContainer.style.display="block"
    verseContainer.innerHTML = '';
    ayats.sort((a, b) => parseInt(a.arabic) - parseInt(b.arabic));
    for (var i = 0; i < ayats.length; i++) {
        var ayat = ayats[i];
        var parts = ayat.urdu.split('|');
        var arabicPart = parts[0].trim();
        var urduPart = parts[1].trim();
        var arabicParagraph = document.createElement('p');
        arabicParagraph.textContent = arabicPart;
        arabicParagraph.style.fontSize = '24px';
        arabicParagraph.style.fontWeight='bold';
        arabicParagraph.style.textAlign = 'right';
        arabicParagraph.style.margin='15px'
        verseContainer.appendChild(arabicParagraph);
        var hr = document.createElement('hr');
        var urduParagraph = document.createElement('p');
        urduParagraph.textContent = urduPart;
        urduParagraph.style.fontSize = '16px';
        urduParagraph.style.textAlign = 'right';
        urduParagraph.style.margin='15px'
        urduParagraph.appendChild(hr);
        verseContainer.appendChild(urduParagraph);
    }
}

function displayNames(ayats) {
    var verseContainer = document.getElementById('Container_namesOfAllah');
    verseContainer.innerHTML = '';
    if (ayats && ayats.length) {
        for (var i = 0; i < ayats.length; i++) {
            var ayat = ayats[i];
            var noParagraph = document.createElement('p');
            noParagraph.textContent = (parseInt(ayat.arabic) + 1);
            var br = document.createElement('br');
            noParagraph.style.fontSize = '21px';
            noParagraph.style.textAlign = 'center';
            noParagraph.style.fontWeight='bold';
            noParagraph.style.border="1px solid rgb(3, 3, 80,)";
            verseContainer.appendChild(noParagraph);
            var parts = ayat.eng.split('|');
            var arabicPart = parts[0].trim();
            var engPart = parts[1].trim();
            var arabicDiv = document.createElement('div');
            var arabicSpan = document.createElement('span');
            arabicSpan.textContent = arabicPart;
            arabicSpan.style.fontSize = '29px';
            arabicDiv.style.textAlign = 'center';
            arabicSpan.style.fontWeight='bolder';
            arabicDiv.style.lineHeight='90px'
            arabicSpan.style.margin='15px'
            arabicDiv.style.height="90px"
            arabicDiv.appendChild(arabicSpan);
            arabicDiv.style.border="1px solid rgb(3, 3, 80,)";
            arabicDiv.style.boxShadow='0 0 20px 6px rgba(3, 3, 80, 0.6)';
            verseContainer.appendChild(arabicDiv);
            var engParagraph = document.createElement('p');
            engParagraph.textContent = engPart;
            engParagraph.style.fontWeight='bold';
            engParagraph.style.fontSize = '17px';
            engParagraph.style.textAlign = 'center';
            engParagraph.style.margin='15px'
            engParagraph.appendChild(br)
            verseContainer.appendChild(engParagraph);
        }
    } else {
        console.error('Invalid or undefined ayats object.');
    }
}

function home_logo(){
    document.getElementById("maincontainer").style.display="block";
    document.getElementById("new_hr").style.display="none";
    document.getElementById("popup").style.display = "none";
    document.getElementsByClassName("container-fluid")[0].style.display = "none";
    document.getElementById('Container_namesOfAllah').style.display="none";
    document.getElementById('Container_Duas').style.display="none";
    document.getElementById('containertafseer').style.display="none";
    document.getElementById('containereng').style.display="none";
    document.getElementById('containerurdu').style.display="none";
    document.getElementsByClassName("above_mode")[0].style.display = "none";
    document.getElementsByClassName("above_mode")[1].style.display = "none";
    document.getElementsByClassName("above_mode")[2].style.display = "none";
    document.getElementsByClassName("above_mode")[3].style.display = "none";
}

function deletewait(){
    document.getElementById("maincontainer").style.display="none";
    document.getElementById("new_hr").style.display="none";
    document.getElementById("popup").style.display = "none";
    document.getElementsByClassName("container-fluid")[0].style.display = "none";
    document.getElementById('Container_namesOfAllah').style.display="none";
    document.getElementById('Container_Duas').style.display="none";
    document.getElementById('containertafseer').style.display="none";
    document.getElementById('containereng').style.display="none";
    document.getElementById('containerurdu').style.display="none";
    document.getElementsByClassName("above_mode")[0].style.display = "none";
    document.getElementsByClassName("above_mode")[1].style.display = "none";
    document.getElementsByClassName("above_mode")[2].style.display = "none";
    document.getElementsByClassName("above_mode")[3].style.display = "none";
}

function Quran_logo(){
    document.getElementById("maincontainer").style.display="none";
    document.getElementsByClassName("above_mode")[0].style.display = "block";
    document.getElementsByClassName("above_mode")[1].style.display = "block";
    document.getElementsByClassName("above_mode")[2].style.display = "block";
    document.getElementsByClassName("above_mode")[3].style.display = "block";
    document.getElementById('Container_Duas').style.display="none";
    document.getElementById('Container_namesOfAllah').style.display="none";
}
function Names_logo(){
    document.getElementById("maincontainer").style.display="none";
    document.getElementsByClassName("above_mode")[0].style.display = "none";
    document.getElementsByClassName("above_mode")[1].style.display = "none";
    document.getElementsByClassName("above_mode")[2].style.display = "none";
    document.getElementById('Container_namesOfAllah').style.display="block";
    document.getElementById('Container_Duas').style.display="none";
}
function Quran(){ 
    document.getElementById("popup").style.display="block";
    document.getElementById("new_hr").style.display="block";
    document.getElementById("maincontainer").style.display="none";
}
function Duas(){
    document.getElementById("maincontainer").style.display="none";
}

function eng(){ 
    document.getElementById("containereng").style.display = "block";
    document.getElementsByClassName("container-fluid")[0].style.display = "none";
    document.getElementById("containerurdu").style.display = "none";
    document.getElementById("containertafseer").style.display = "none";
    document.getElementById("popup").style.display = "none";
    document.getElementById("Container_Duas").style.display = "none";
    document.getElementsByClassName("above_mode")[0].style.display = "block";
    document.getElementsByClassName("above_mode")[1].style.display = "block";
    document.getElementsByClassName("above_mode")[2].style.display = "block";
    document.getElementsByClassName("above_mode")[3].style.display = "block";
}

function urdu(){ 
    document.getElementById("containerurdu").style.display = "block";
    document.getElementsByClassName("container-fluid")[0].style.display = "none";
    document.getElementById("containereng").style.display = "none";
    document.getElementById("popup").style.display = "none";
    document.getElementById("containertafseer").style.display = "none";
    document.getElementById("Container_Duas").style.display = "none";
    document.getElementsByClassName("above_mode")[0].style.display = "block";
    document.getElementsByClassName("above_mode")[1].style.display = "block";
    document.getElementsByClassName("above_mode")[2].style.display = "block";
    document.getElementsByClassName("above_mode")[3].style.display = "block";
}

function reading(){
    var verseContainer = document.getElementById('verse-container');
    document.getElementsByClassName("container-fluid")[0].style.display = "block";
    document.getElementById("popup").style.display = "none";
    document.getElementById("Container_Duas").style.display = "none";
    document.getElementById("containertafseer").style.display = "none";
    document.getElementById("containerurdu").style.display = "none";
    document.getElementById("containereng").style.display = "none";
    document.getElementsByClassName("above_mode")[0].style.display = "block";
    document.getElementsByClassName("above_mode")[1].style.display = "block";
    document.getElementsByClassName("above_mode")[2].style.display = "block";
    document.getElementsByClassName("above_mode")[3].style.display = "block";
}

function tafseer(){ 
    document.getElementById("containertafseer").style.display = "block";
    document.getElementsByClassName("container-fluid")[0].style.display = "none";
    document.getElementById("Container_Duas").style.display = "none";
    document.getElementById("popup").style.display = "none";
    document.getElementById("containerurdu").style.display = "none";
    document.getElementById("containereng").style.display = "none";
    document.getElementsByClassName("above_mode")[0].style.display = "block";
    document.getElementsByClassName("above_mode")[1].style.display = "block";
    document.getElementsByClassName("above_mode")[2].style.display = "block";
    document.getElementsByClassName("above_mode")[3].style.display = "block";
}

document.addEventListener('DOMContentLoaded', function() {
    var heartIcon = document.getElementById('heart-icon');
    heartIcon.addEventListener('click', toggleHeartColor);
});

function stopaudio() {
    document.getElementById('stopbtn').style.display='none'
    document.getElementById('playbtn').style.display='block'
    const audio = document.getElementById('audio'+selected_surah);
    audio.pause();
    audio.currentTime = 0;
}

function playaudio() {
    if(selected_surah!=0){
        document.getElementById('stopbtn').style.display='block'
        document.getElementById('playbtn').style.display='none'
        console.log(selected_surah)
        const audio = document.getElementById('audio'+selected_surah);
        console.log(audio)
        audio.play();}
} 

document.addEventListener("DOMContentLoaded", function() {
    // JavaScript code to toggle between start page, sign-up, and login forms
    document.getElementById("signupbtn").addEventListener("click", function() {
        document.getElementById("start-page").classList.add("hidden");
        document.getElementById("signup-form").classList.remove("hidden");
        document.getElementById("login-form").classList.add("hidden");
        document.getElementById("main").style.display = "none";
        document.getElementById("loginbtn").style.display = "block";});
        
    document.getElementById("loginbtn").addEventListener("click", function() {
        document.getElementById("start-page").classList.add("hidden");
        document.getElementById("signup-form").classList.add("hidden");
        document.getElementById("login-form").classList.remove("hidden");
        document.getElementById("main").style.display = "none";});
    
    document.getElementById("login-link").addEventListener("click", function() {
        document.getElementById("start-page").classList.add("hidden");
        document.getElementById("signup-form").classList.add("hidden");
        document.getElementById("login-form").classList.remove("hidden");});
    
    document.getElementById("signup-link").addEventListener("click", function() {
        document.getElementById("start-page").classList.add("hidden");
        document.getElementById("signup-form").classList.remove("hidden");
        document.getElementById("login-form").classList.add("hidden");});
});

async function fetch_user_no(url) {
    return new Promise((resolve, reject) => {
        console.log("hhhhiiyft");
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        console.log('Before sending request to:', url);
        xhr.onreadystatechange = function() {
            console.log('Ready state:', xhr.readyState);
            if (xhr.readyState === 4) {
                console.log('Request to', url, 'completed');
                if (xhr.status === 200) {
                    console.log("Received response:", xhr.responseText);
                    var parsedResponse = JSON.parse(xhr.responseText);
                    console.log('Parsed response:', parsedResponse);
                    userno=parsedResponse.userno;
                    console.log("userno in no fuc:"+userno)
                    resolve(parsedResponse.userno); 
                } else {
                    console.error('Error fetching user number:', xhr.statusText);
                    reject(new Error(xhr.statusText)); // Reject the promise on error
                }
            } else {
                console.log('Ready state:', xhr.readyState);
            }};
        xhr.send();});
}

async function fetchSignup(event) {
    event.preventDefault();
    // Get input values
    var username = document.getElementById("signup-username").value;
    var email = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-password").value;
    var confirmPassword = document.getElementById("signup-confirm-password").value;
    var messageElement = document.getElementById("signup-message");
    console.log("ooooo");
    try {
        // Fetch the latest user number
        await fetch_user_no('http://localhost:3000/getlatestuserno');
        console.log("Fetched user number:", userno);
        var newuserno = ++userno;
        console.log("Incremented user number:", newuserno);
        // Make the signup request with the new user number
        const url = `http://localhost:3000/signup/${email}/${password}/${confirmPassword}/${newuserno}`;
        const response = await fetch(url, { method: 'POST' });
        const parsedResponse = await response.json();
        if (parsedResponse.message === 'Signup successful') {
            document.getElementById("maincontainer").style.display = "block";
            document.getElementById("brand").style.display = "block";
            document.getElementById("login").style.display = "none";
            userno = newuserno;
            console.log("newuserno:" + userno);
            // Optionally, perform other actions after successful signup
        } else {
            messageElement.textContent = parsedResponse.message;
        }
    } catch (error) {
        console.error('An error occurred while signing up:', error);
        messageElement.textContent = "An error occurred during signup.";
    }
}

async function fetchLogin(event) {
    event.preventDefault();
    var email = document.getElementById("login-email").value;
    var password = document.getElementById("login-password").value;
    var messageElement = document.getElementById("login-message");
   
    var url = `http://localhost:3000/login/${email}/${password}`;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    console.log('Before sending request to:', url);

    xhr.onreadystatechange = function() {
        console.log('Ready state:', xhr.readyState);
        if (xhr.readyState === 4) {
            console.log('Request to', url, 'completed');
            if (xhr.status === 200) {
                console.log("Received response:", xhr.responseText);
                var parsedResponse = JSON.parse(xhr.responseText);
                console.log('Parsed response:', parsedResponse);
                if (parsedResponse.message === 'Login successful') {
                    document.getElementById("maincontainer").style.display = "block";
                    document.getElementById("brand").style.display = "block";
                    document.getElementById("login").style.display = "none";
                    userno = parsedResponse.userno; 
                    console.log('Logged in user number:', userno);
                    document.getElementById("login-email").value="";
                    document.getElementById("login-password").value="";
                    // document.getElementById("main").style.display = "none";
                    // document.getElementsByClassName[0]("container").style.display = "none";
                } else {
                    messageElement.textContent = parsedResponse.message;
                }
            } else {
                messageElement.textContent = "An error occurred during login.";}}};
    xhr.send();
}

async function logout() {
    document.getElementById("start-page").classList.remove("hidden");
    document.getElementById("dropdown-menu").style.display = "none";
    document.getElementById("main-container").style.display = "none";
    document.getElementById("main").style.display = "block";
    document.getElementById("login").style.display = "block";
    document.getElementsByClassName("hero")[0].style.display = "block";
    document.getElementById("maincontainer").style.display = "none";
    document.getElementById("brand").style.display = "none";
    document.getElementById("new_hr").style.display = "none";
    document.getElementsByClassName("above_mode")[0].style.display = "none";
    document.getElementsByClassName("above_mode")[1].style.display = "none";
    document.getElementsByClassName("above_mode")[2].style.display = "none";
    document.getElementsByClassName("above_mode")[3].style.display = "none";
    document.getElementsByClassName("container-fluid")[0].style.display = "none";
    document.getElementById('Container_namesOfAllah').style.display = "none";
    document.getElementById('Container_Duas').style.display = "none";
    document.getElementById('containertafseer').style.display = "none";
    document.getElementById('containereng').style.display = "none";
    document.getElementById('containerurdu').style.display = "none";
}

async function Delete(oldurl) {
    // Prompt the user with a confirmation dialog
    var confirmDelete = confirm("Are you sure you want to delete your account permanently?");
    console.log(userno);
    // Check if the user confirmed the deletion
    if (confirmDelete) {
        var url = `${oldurl}/${userno}`;
        var xhr = new XMLHttpRequest();
        xhr.open('DELETE', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                // Show the success message
                var messageContainer = document.getElementById("delete-message-container");
                var deleteMessage = document.getElementById("delete-message");
                deleteMessage.textContent = "Your account has been permanently deleted";
                messageContainer.style.display = "block";
                // Hide the message after 3 seconds
                deletewait();
                setTimeout(function() {
                    messageContainer.style.display = "none";
                    // Call logout after an additional 2 seconds
                    setTimeout(function() {
                        logout();
                    }, 2000); // 2000 milliseconds = 2 seconds
                }, 3000);
            } else if (xhr.readyState === 4) {
                console.error("Failed to delete account");}};
        xhr.send();
    } else {
        // Do nothing if the user cancels the deletion
        console.log("Account deletion cancelled");
    }
}

async function direct_surahs(url)
{   document.getElementById('containerfavourites').style.display = 'none';
    Quran();reading();
    fetchOldVerses(url);
}

function fetchfavourites(url) {
    var xhr = new XMLHttpRequest();
    console.log("signupuserno"+userno)
    var modifiedUrl = `${url}/${userno}`; 
    xhr.open('GET', modifiedUrl, true);
    console.log('Before sending request to:', modifiedUrl);
    var parsedResponse;
    xhr.onreadystatechange = function() {
        console.log('Ready state:', xhr.readyState);
        if (xhr.readyState === 4) {
            console.log('Request to', modifiedUrl, 'completed');
            if (xhr.status === 200) {
                console.log("Received response:", xhr.responseText);
                parsedResponse = JSON.parse(xhr.responseText);
                console.log('Parsed response:', parsedResponse);
                if (modifiedUrl.includes("favourites")) {
                    console.log("ggggg");
                    console.log(parsedResponse);
                    DisplayFavouriteList(parsedResponse);}}}};
    xhr.send();
}

 async function removefavourite(oldurl) {
    console.log("hhhhh")
    var url= `${oldurl}/${userno}`;
    var xhr = new XMLHttpRequest();
    xhr.open('DELETE', url, true); // Use DELETE method for removal
    console.log('Before sending request to:', url);

    xhr.onreadystatechange = function() {
        console.log('Ready state:', xhr.readyState);
        if (xhr.readyState === 4) {
            console.log('Request to', url, 'completed');
            if (xhr.status === 200) {
                console.log("Received response:", xhr.responseText);
                // Optionally, update the UI or perform other actions based on the response
            } else {
                console.error("Error:", xhr.statusText);}}};
    xhr.send();
}

function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('show');
}

function showChangePasswordForm() {
    document.getElementById('change-password-form').classList.add('show');
    document.getElementById('dropdown-menu').classList.remove('show');
}

function hideChangePasswordForm() {
    document.getElementById('change-password-form').classList.remove('show');
}

async function changePassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match!");
        return;
    }
    try {
        // Verify the old password
        const verifyResponse = await fetch(`http://localhost:3000/checkpassword/${userno}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword })});
        if (!verifyResponse.ok) {
            const verifyError = await verifyResponse.json();
            alert("Error verifying old password: " + verifyError.message);
            return;
        }
        // Change the password if old password is verified
        const changeResponse = await fetch(`http://localhost:3000/changepassword/${userno}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword })});
        if (changeResponse.ok) {
            alert("Password changed successfully!");
            hideChangePasswordForm();
        } else {
            const changeError = await changeResponse.json();
            alert("Error changing password: " + changeError.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert("An error occurred while changing the password.");
    }
}

function fetchBookmarks(url) {
    var xhr = new XMLHttpRequest();
    console.log("fetchBookmarksuserno"+userno)
    var modifiedUrl = `${url}/${userno}`; 
    xhr.open('GET', modifiedUrl, true);
    console.log('Before sending request to:', modifiedUrl);
    var parsedResponse;
    xhr.onreadystatechange = function() {
        console.log('Ready state:', xhr.readyState);
        if (xhr.readyState === 4) {
            console.log('Request to', modifiedUrl, 'completed');
            if (xhr.status === 200) {
                console.log("Received response:", xhr.responseText);
                parsedResponse = JSON.parse(xhr.responseText);
                console.log('Parsed response:', parsedResponse);
                    console.log(parsedResponse);
                    displayBookmarks(parsedResponse);}}};
    xhr.send();
}

function displayBookmarks(bookmarks) {
    document.getElementById('containerbookmarks').style.display="block"
    const bigBox = document.getElementById('big-box');
    const smallBoxesContainer = document.getElementById('small-boxes-container');
    smallBoxesContainer.innerHTML = ''; // Clear previous bookmarks
    bigBox.style.display = 'block'; // Show the big box container

    bookmarks.forEach(bookmark => {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-item';
        bookmarkElement.style.marginBottom = '10px';
        bookmarkElement.style.border = '1px solid #ccc';
        bookmarkElement.style.padding = '10px';
        bookmarkElement.style.borderRadius = '5px';
        bookmarkElement.style.position = 'relative';
        const surahElement = document.createElement('div');
        surahElement.className = 'favorite-surah';
        surahElement.style.cursor = 'pointer';
        surahElement.setAttribute('onclick', `direct_bookmark('http://localhost:3000/surahbookmark/${bookmark.surahNo}/${bookmark.ayatNo}')`);
        const surahNoElement = document.createElement('p');
        surahNoElement.textContent = `Surah No: ${bookmark.surahNo}`;
        const ayahNoElement = document.createElement('p');
        ayahNoElement.textContent = `Ayah No: ${bookmark.ayatNo}`;
        const surahNameElement = document.createElement('p');
        surahNameElement.textContent = `Surah Name: ${bookmark.surahName}`;
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = (event) => {
            event.stopPropagation();
            closebookmark(bookmarkElement); 
            removeBookmark(`http://localhost:3000/closebookmark/${bookmark.surahName}/${bookmark.surahNo}/${bookmark.ayatNo}`);}; // Pass the bookmark ID to remove
        surahElement.appendChild(surahNoElement);
        surahElement.appendChild(ayahNoElement);
        surahElement.appendChild(surahNameElement);
        surahElement.appendChild(closeButton);
        bookmarkElement.appendChild(surahElement);
        const hr = document.createElement('hr');
        bookmarkElement.appendChild(hr);
        smallBoxesContainer.appendChild(bookmarkElement);});
}

function closebookmark(surahElement) {
    surahElement.style.display = 'none';
}

function closebookmark() {
    document.getElementById('containerbookmarks').style.display = 'none';
}

document.getElementById('close-big-box').addEventListener('click', function() {
    document.getElementById('big-box').style.display = 'none';
});

async function removeBookmark(oldurl) {
    var url= `${oldurl}/${userno}`;
    try {
        const response = await fetch(url, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log("Bookmark removed successfully");
        } else {
            const error = await response.json();
            console.error(`Error removing bookmark: ${error.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.addEventListener('click', function(event) {
    const clickedElement = event.target;
    if (clickedElement.id) {
        console.log('Clicked element ID:', clickedElement.id);
    } else {
        console.log('Clicked element has no ID');
    }
});

async function direct_bookmark(url){   
    document.getElementById('containerbookmarks').style.display = 'none';
    Quran();reading();
    fetchOldVerses(url);
}

 function displayDuas(duas) {
    Duas();
    var verseContainer = document.getElementById('Container_Duas');
    verseContainer.style.display = "block";
    verseContainer.innerHTML = '';

    for (var i = 0; i < duas.length; i++) {
        var dua = duas[i];
        var duaContainer = document.createElement('div');
        duaContainer.classList.add('dua-container');
        var nameParagraph = document.createElement('p');
        nameParagraph.id = 'duaname';
        nameParagraph.textContent = dua.name;
        duaContainer.appendChild(nameParagraph);
        var arabicParagraph = document.createElement('p');
        arabicParagraph.classList.add('arabic-text');
        arabicParagraph.textContent = dua.arabicText;
        duaContainer.appendChild(arabicParagraph);
        var translationParagraph = document.createElement('p');
        translationParagraph.classList.add('dua-attribute');
        translationParagraph.textContent = dua.translation;
        duaContainer.appendChild(translationParagraph);
        verseContainer.appendChild(duaContainer);}
}

function fetchDuas(url) {
    console.log(url);
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');}
            return response.json();})
        .then(data => {
            // Call displayDuas function to render the fetched Duas data
            displayDuas(data);})
        .catch(error => {
            console.error('There was a problem with your fetch operation:', error);});
}

function DisplayWordbyWord(arabic, ayats) {
    var verseContainer = document.getElementById('verse-containertafseer');
    verseContainer.style.display = "block";
    verseContainer.innerHTML = '';
    if (!ayats.length) {
        console.error('No data found for the specified surah.');
        return;}
    // Group ayats by ayatNo to display verses together
    var groupedAyats = ayats.reduce((acc, ayat) => {
        if (!acc[ayat.ayatNo]) {
            acc[ayat.ayatNo] = [];
        }
        acc[ayat.ayatNo].push(ayat);
        return acc;},{});
    // Sort ayats by ayatNo and then by wordNo within each ayat
    var sortedAyats = Object.keys(groupedAyats).sort((a, b) => a - b).map(ayatNo => {
        return groupedAyats[ayatNo].sort((a, b) => a.wordNo - b.wordNo);});
    // Display each ayat with word-by-word translation
    sortedAyats.forEach(ayat => {
        // Create a container for the whole ayat
        var ayatContainer = document.createElement('div');
        ayatContainer.style.marginBottom = '20px';
        // Create and append the paragraph for the whole ayat in Arabic
        var fullAyatParagraph = document.createElement('p');
        fullAyatParagraph.style.fontFamily = 'Arial, Helvetica, sans-serif';
        fullAyatParagraph.style.fontSize = '24px';
        fullAyatParagraph.style.textAlign = 'center';
        fullAyatParagraph.style.fontWeight = 'bolder';
        fullAyatParagraph.style.margin = '15px';
        // Create the full ayat in Arabic
        var fullAyatText = ayat.map(word => word.arabicWord).join(' ');
        fullAyatParagraph.textContent = fullAyatText;
        verseContainer.appendChild(fullAyatParagraph);
        // Add a horizontal line after the full ayat
        var hrAfterAyat = document.createElement('hr');
        verseContainer.appendChild(hrAfterAyat);
        // Create a table-like structure for word-by-word translation
        var table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';
        ayat.forEach(word => {
            console.log("Processing word:", word);
            var row = document.createElement('tr');
            var englishCell = document.createElement('td');
            englishCell.style.border = '1px solid black';
            englishCell.style.padding = '8px';
            englishCell.style.fontSize = '19px';
            englishCell.style.color = 'red';
            var arabicCell = document.createElement('td');
            arabicCell.style.border = '1px solid black';
            arabicCell.style.padding = '8px';
            arabicCell.style.fontFamily = 'Arial, Helvetica, sans-serif';
            arabicCell.style.fontSize = '24px';
            arabicCell.style.fontWeight = 'bolder';
            arabicCell.style.textAlign = 'right';
            // Check and append englishTranslation
            if (word.englishTranslation) {
                englishCell.textContent = word.englishTranslation;
            } else {
                console.error("English translation missing for:", word);
            }
            // Check and append arabicWord
            if (word.arabicWord) {
                arabicCell.textContent = word.arabicWord;
            } else {
                console.error("Arabic word missing for:", word);
            }
            row.appendChild(englishCell);
            row.appendChild(arabicCell);
            table.appendChild(row);});
        verseContainer.appendChild(table);
        // Add a horizontal line after each ayat's word-by-word table
        var hrAfterTable = document.createElement('hr');
        verseContainer.appendChild(hrAfterTable);});
}