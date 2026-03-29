// select elements from the DOM
const inputElement = document.querySelector("#favchap");
const buttonElement = document.querySelector("button");
const listElement = document.querySelector("#list");

let chaptersArray = getChapterList() || [];

chaptersArray.forEach(chapter => {
    displayList(chapter);
});

buttonElement.addEventListener('click', () => {
    if (inputElement.value != '') {  // make sure the input is not empty
        displayList(inputElement.value); // call the function that outputs the submitted chapter
        chaptersArray.push(inputElement.value);  // add the chapter to the array
        setChapterList(); // update the localStorage with the new array
        inputElement.value = ''; // clear the input
        inputElement.focus(); // set the focus back to the input
    }
});

function displayList(item) {
    let li = document.createElement('li');
    let deletebutton = document.createElement('button');
    li.textContent = item; // note the use of the displayList parameter 'item'
    deletebutton.textContent = '❌';
    deletebutton.classList.add('delete'); // this references the CSS rule .delete{width:fit-content;} to size the delete button
    li.append(deletebutton);
    listElement.append(li);
    deletebutton.addEventListener('click', function () {
        listElement.removeChild(li);
        deleteChapter(li.textContent); // note this new function that is needed to remove the chapter from the array and localStorage.
        inputElement.focus(); // set the focus back to the input
    });
    console.log('I like to copy code instead of typing it out myself and trying to understand it.');
  }

function setChapterList() {
    localStorage.setItem('myFavBOMList', JSON.stringify(chaptersArray));
}
  
function getChapterList() {
    return JSON.parse(localStorage.getItem('myFavBOMList'));
}
  
function deleteChapter(chapter) {
    chapter = chapter.slice(0, chapter.length - 1);
    chaptersArray = chaptersArray.filter(item => item !== chapter);
    setChapterList();
}
  




// Previous js proramming . . . commenting out to build the new structure
// wait for button clicks
// buttonElement.addEventListener("click", function () {
//     // Check if the user entered something
//     if (inputElement.value.trim() != "") {
//         // create list item and give it the value of the input
//         const li = document.createElement("li");
//         li.textContent = inputElement.value;
//         // create a button and add a click event listener
//         const deleteBtn = document.createElement("button");
//         deleteBtn.textContent = "❌";
//         deleteBtn.addEventListener("click", function () {
//             listElement.removeChild(li);
//             inputElement.focus();
//         });
//         // add the button to the list item
//         li.appendChild(deleteBtn);
//         // OUTPUT: finally display the completed list item to the unordered list
//         listElement.appendChild(li);
//         // clear the user input field
//         inputElement.value = "";
//     }
//     // focus the user back to the input field
//     inputElement.focus();
// });