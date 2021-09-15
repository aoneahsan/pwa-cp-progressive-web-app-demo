// On demand cache approache
const cachesAvailableInWindow = "caches" in window;
const indexedDBAvailableInWindow = "indexedDB" in window;
const serviceWorkerAvailableInNavigator = "serviceWorker" in navigator;
const syncManagerAvailableInWindow = "SyncManager" in window;

const shareImageButton = document.querySelector("#share-image-button");
const createPostArea = document.querySelector("#create-post");
const closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
const sharedMomentsArea = document.querySelector("#shared-moments");
const createPostForm = document.querySelector("#post-create-form");
const createPostTitle = document.querySelector("#title");
const createPostLocation = document.querySelector("#location");
const snackBarContainer = document.querySelector("#confirmation-toast");

function openCreatePostModal() {
  // createPostArea.style.display = 'block'
  createPostArea.style.transform = "translateY(0)";

  // SW Related Code
  // check if browser tried to prompt install pwa, if yes, then show install prompt now
  // we stored install prompt event in a variable and that variable is available in this file
  if (pwaInstallPromptEvent) {
    // fire prompt event
    pwaInstallPromptEvent.prompt();

    // listen for user action and proceed accordingly
    pwaInstallPromptEvent.userChoice.then((res) => {
      if (res.outcome === "dismissed") {
        console.log("[Feed.js] pwa install prompt was dismissed by user.");
      } else {
        console.log("[Feed.js] user installed pwa successfully.");
      }
    });

    // set event to null so we don't ask user to install app again and again
    // when he clicks on create new post button, (Hint: instead os clearing
    // event you can store a counter in localstorage and show prompt again
    // after user add posts few more times :)
    pwaInstallPromptEvent = null;
  }
}

function closeCreatePostModal() {
  // createPostArea.style.display = 'none'
  createPostArea.style.transform = "translateY(100vh)";
}

shareImageButton.addEventListener("click", openCreatePostModal);

closeCreatePostModalButton.addEventListener("click", closeCreatePostModal);

// Create Post Form Submit Handler
createPostForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (
    createPostTitle.value.trim() == "" ||
    createPostLocation.value.trim() == ""
  ) {
    alert("Please enter valid data!");
    return;
  }

  closeCreatePostModal();

  createPostTitle.value = "";
  createPostLocation.value = "";

  const postData = {
    id: new Date().toISOString(),
    title: createPostTitle.value,
    location: createPostLocation.value,
    image:
      "https://firebasestorage.googleapis.com/v0/b/pwa-cp.appspot.com/o/sf-boat.jpg?alt=media&token=eb466a4e-c360-46b0-bd49-41993eb627a0",
  };

  // check if SyncManager is available in window
  if (serviceWorkerAvailableInNavigator && syncManagerAvailableInWindow) {
    let swHolder;
    navigator.serviceWorker.ready
      .then((sw) => {
        swHolder = sw;
        return writeDataInIndexDB(POSTS_SYNC_DB_TABLE_NAME, postData);
      })
      .then((res) => {
        return swHolder.sync.register(SYNC_MANAGER_KEY_FOR_POST_SYNC);
      })
      .then(() => {
        const data = { message: "Post added in sync will be created shortly." };
        snackBarContainer.MaterialSnackbar.showSnackbar(data);
      })
      .catch((err) => {
        console.error(
          "Error while adding post to sync to create on server, err: ",
          err
        );
      });
  } else {
    // sync manager not available just try to send post
    sendDataToUrl(urlToPostsApiPost, postData)
      .then((res) => {
        updateCardsUi();
      })
      .catch((err) => {
        console.error(
          "Error while storing/sending data in server, error: ",
          err
        );
      });
  }
});

// UI Cards
function createCard(data) {
  const cardWrapper = document.createElement("div");
  cardWrapper.className = "shared-moment-card mdl-card mdl-shadow--2dp";

  const cardTitle = document.createElement("div");
  cardTitle.className = "mdl-card__title";
  cardTitle.style.backgroundImage = `url(${data.image})`;
  cardTitle.style.backgroundSize = "cover";
  cardTitle.style.height = "180px";
  cardWrapper.appendChild(cardTitle);

  const cardTitleTextElement = document.createElement("h2");
  cardTitleTextElement.className = "mdl-card__title-text";
  cardTitleTextElement.textContent = data.title;
  cardTitleTextElement.style.color = "white";
  cardTitle.appendChild(cardTitleTextElement);

  const cardSupportingText = document.createElement("div");
  cardSupportingText.className = "mdl-card__supporting-text";
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = "center";

  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

const clearCards = () => {
  while (sharedMomentsArea.hasChildNodes()) {
    if (sharedMomentsArea.lastChild) {
      sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
    }
  }
};

const updateCardsUi = (data) => {
  clearCards();
  for (let i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
};

const setUpCardsUi = (data) => {
  const dataArray = [];
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      dataArray.push(data[key]);
    }
  }
  updateCardsUi(dataArray);
};

// From Web & Cache, use cache if get first and then update with latest one or simply use network one if get first/available
// make request to network and cache at same time

let networkResponseRecieved = false;
// 1
fetch(urlToPostsApiGet)
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    networkResponseRecieved = true;
    setUpCardsUi(data);
  });

// 1
if (indexedDBAvailableInWindow) {
  readDataFromIndexDB(POSTS_DB_TABLE_NAME)
    .then((data) => {
      if (!networkResponseRecieved) {
        updateCardsUi(data);
      }
    })
    .catch((err) => {
      console.error(
        "[Feed.js] ERROR while getting data from indexedDB: err:",
        err
      );
    });
}

// unregister registered service workers
const unregisterServiceWorkers = () => {
  const unregisterButton = document.getElementById("unregister-service-worker");
  unregisterButton.addEventListener("click", () => {
    if (serviceWorkerAvailableInNavigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let i = 0; i < registrations.length; i++) {
          registrations[i].unregister();
        }
      });
    }
  });
};
