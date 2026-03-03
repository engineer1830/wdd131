// select elements from the DOM
const inputElement = document.querySelector("#favchap");
const buttonElement = document.querySelector("button");
const listElement = document.querySelector("#list");

// wait for button clicks
buttonElement.addEventListener("click", function () {
    // Check if the user entered something
    if (inputElement.value.trim() != "") {
        // create list item and give it the value of the input
        const li = document.createElement("li");
        li.textContent = inputElement.value;
        // create a button and add a click event listener
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "❌";
        deleteBtn.addEventListener("click", function () {
            listElement.removeChild(li);
            inputElement.focus();
        });
        // add the button to the list item
        li.appendChild(deleteBtn);
        // OUTPUT: finally display the completed list item to the unordered list
        listElement.appendChild(li);
        // clear the user input field
        inputElement.value = "";
    }
    // focus the user back to the input field
    inputElement.focus();
});