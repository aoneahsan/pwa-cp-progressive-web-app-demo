// Global constants

// On demand cache approache
const shareImageButton = document.querySelector('#share-image-button')
const createPostArea = document.querySelector('#create-post')
const closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
)
const sharedMomentsArea = document.querySelector('#shared-moments')
const createPostForm = document.querySelector('#post-create-form')
const createPostTitle = document.querySelector('#title')
const createPostLocation = document.querySelector('#location')
const manualLocationArea = document.querySelector('#manual-location')
const snackBarContainer = document.querySelector('#confirmation-toast')
const videoPlayer = document.querySelector('#player')
const canvasElement = document.querySelector('#canvas')
const captureBtn = document.querySelector('#capture-btn')
const imagePickerArea = document.querySelector('#pick-image')
const imagePicker = document.querySelector('#image-picker')
let selectedImage
const locationBtn = document.querySelector('#location-btn')
const locationLoader = document.querySelector('#location-loader')
let userLocationCoords

const initializeMedia = () => {
  selectedImage = null

  if (!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {}
  }

  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = constraints => {
      var getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia

      if (!getUserMedia) {
        return Promise.reject(
          new Error('getUserMedia not available on your browser')
        )
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject)
      })
    }
  }

  const constraints = {
    video: true
    // audio: true // not needed in our case
  }
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(videoStream => {
      videoPlayer.style.display = 'block'
      captureBtn.style.display = 'block'
      videoPlayer.srcObject = videoStream
    })
    .catch(err => {
      imagePickerArea.style.display = 'block'
    })
}

const initializeLocation = () => {
  if (!('geolocation' in navigator)) {
    locationBtn.style.display = 'none'
    return
  } else {
    locationBtn.style.display = 'inline'
    locationLoader.style.display = 'none'
  }
}

imagePicker.addEventListener('change', event => {
  selectedImage = event.target.files[0]
})

// capture button click listener
captureBtn.addEventListener('click', event => {
  videoPlayer.style.display = 'none'
  captureBtn.style.display = 'none'
  canvasElement.style.display = 'block'

  const context = canvasElement.getContext('2d')
  context.drawImage(
    videoPlayer,
    0,
    0,
    canvas.width,
    videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width)
  )

  videoPlayer.srcObject.getTracks().forEach(track => {
    track.stop()
  })

  const imageBase64Url = canvasElement.toDataURL()
  selectedImage = dataURItoBlob(imageBase64Url)
})

// pic location btn click listener
locationBtn.addEventListener('click', event => {
  if (!('geolocation' in navigator)) {
    locationBtn.style.display = 'none'
    return
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      locationBtn.style.display = 'none'
      locationLoader.style.display = 'block'
      userLocationCoords = position.coords
      // google api to get reverse geocoding address
      // https://maps.googleapis.com/maps/api/geocode/json?latlng=40.714224,-73.961452&key=YOUR_API_KEY

      createPostLocation.value = 'In Lahore'
      manualLocationArea.classList.add('is-foused')
      locationLoader.style.display = 'none'
    },
    err => {
      console.error(
        '[Feed.js] Error occured while getting user location, err: ',
        err
      )
      locationBtn.style.display = 'none'
      locationLoader.style.display = 'none'
      userLocationCoords = null
      alert('Error occured while getting user location.')
    },
    { timeout: 7000 }
  )
})

function openCreatePostModal () {
  setTimeout(() => {
    // createPostArea.style.display = 'block'
    createPostArea.style.transform = 'translateY(0)'
  }, 1)

  // invoke initialize media function
  initializeMedia()

  // invoke initialize location function
  initializeLocation()

  // SW Related Code
  // check if browser tried to prompt install pwa, if yes, then show install prompt now
  // we stored install prompt event in a variable and that variable is available in this file
  if (pwaInstallPromptEvent) {
    // fire prompt event
    pwaInstallPromptEvent.prompt()

    // listen for user action and proceed accordingly
    pwaInstallPromptEvent.userChoice.then(res => {
      if (res.outcome === 'dismissed') {
        console.log('[Feed.js] pwa install prompt was dismissed by user.')
      } else {
        console.log('[Feed.js] user installed pwa successfully.')
      }
    })

    // set event to null so we don't ask user to install app again and again
    // when he clicks on create new post button, (Hint: instead os clearing
    // event you can store a counter in localstorage and show prompt again
    // after user add posts few more times :)
    pwaInstallPromptEvent = null
  }
}

function closeCreatePostModal () {
  setTimeout(() => {
    // createPostArea.style.display = 'none'
    createPostArea.style.transform = 'translateY(100vh)'
  }, 1)
  videoPlayer.style.display = 'none'
  canvasElement.style.display = 'none'
  imagePickerArea.style.display = 'none'
  if (videoPlayer.srcObject) {
    videoPlayer.srcObject.getTracks().forEach(track => {
      track.stop()
    })
  }
}

shareImageButton.addEventListener('click', openCreatePostModal)

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal)

const resetCreatePostFormData = () => {
  createPostTitle.value = ''
  createPostLocation.value = ''
  selectedImage = null
  userLocationCoords = null
}

// Create Post Form Submit Handler
createPostForm.addEventListener('submit', event => {
  event.preventDefault()

  if (
    createPostTitle.value.trim() == '' ||
    createPostLocation.value.trim() == '' ||
    !selectedImage
  ) {
    alert('Please enter valid data!')
    return
  }

  closeCreatePostModal()

  const title = createPostTitle.value
  const location = createPostLocation.value

  const postData = {
    id: new Date().toISOString(),
    title,
    location,
    image: selectedImage,
    userLocationCoords: JSON.stringify(userLocationCoords)
  }

  // check if SyncManager is available in window
  if (serviceWorkerAvailableInNavigator && syncManagerAvailableInWindow) {
    let swHolder
    navigator.serviceWorker.ready
      .then(sw => {
        swHolder = sw
        return writeDataInIndexDB(POSTS_SYNC_DB_TABLE_NAME, postData)
      })
      .then(res => {
        return swHolder.sync.register(SYNC_MANAGER_KEY_FOR_POST_SYNC)
      })
      .then(() => {
        const data = { message: 'Post added in sync will be created shortly.' }
        snackBarContainer.MaterialSnackbar.showSnackbar(data)

        // reset form data
        resetCreatePostFormData()
      })
      .catch(err => {
        console.error(
          'Error while adding post to sync to create on server, err: ',
          err
        )

        // reset form data
        resetCreatePostFormData()
      })
  } else {
    // sync manager not available just try to send post
    const postFormData = new FormData()
    postFormData.append('id', postData.id)
    postFormData.append('title', postData.title)
    postFormData.append('location', postData.location)
    postFormData.append('image', postData.image, postData.id + '.png')
    postFormData.append('userLocationCoords', postData.userLocationCoords)

    sendFormDataToUrl(urlToPostsApiPost, postFormData)
      .then(res => {
        const data = { message: 'Post created successfully.' }
        snackBarContainer.MaterialSnackbar.showSnackbar(data)

        // reset form data
        resetCreatePostFormData()
      })
      .catch(err => {
        console.error(
          'Error while storing/sending data in server, error: ',
          err
        )
        alert('Error occured while creating post.')
        resetCreatePostFormData()
      })
  }

  // for node server testing
  // const postFormData = new FormData()
  // postFormData.append('id', postData.id)
  // postFormData.append('title', postData.title)
  // postFormData.append('location', postData.location)
  // postFormData.append('image', postData.image, postData.id + '.png')
  // postFormData.append('userLocationCoords', postData.userLocationCoords)

  // const nodeServerUrl = 'http://localhost:4001/postdata'
  // sendFormDataToUrl(nodeServerUrl, postFormData)
  //   .then(res => {
  //     console.log('Post data sent to server res: ', res)
  //     const data = { message: 'Post created successfully.' }
  //     snackBarContainer.MaterialSnackbar.showSnackbar(data)

  //     // reset form data
  //     resetCreatePostFormData()
  //   })
  //   .catch(err => {
  //     console.error('Error while storing/sending data in server, error: ', err)
  //     alert('Error occured while creating post.')
  //     resetCreatePostFormData()
  //   })
})

// UI Cards
function createCard (data) {
  const cardWrapper = document.createElement('div')
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp'

  const cardTitle = document.createElement('div')
  cardTitle.className = 'mdl-card__title'
  cardTitle.style.backgroundImage = `url(${data.image})`
  cardTitle.style.backgroundSize = 'cover'
  cardTitle.style.height = '180px'
  cardWrapper.appendChild(cardTitle)

  const cardTitleTextElement = document.createElement('h2')
  cardTitleTextElement.className = 'mdl-card__title-text'
  cardTitleTextElement.textContent = data.title
  cardTitleTextElement.style.color = 'white'
  cardTitle.appendChild(cardTitleTextElement)

  const cardSupportingText = document.createElement('div')
  cardSupportingText.className = 'mdl-card__supporting-text'
  cardSupportingText.textContent = data.location
  cardSupportingText.style.textAlign = 'center'

  cardWrapper.appendChild(cardSupportingText)
  componentHandler.upgradeElement(cardWrapper)
  sharedMomentsArea.appendChild(cardWrapper)
}

const clearCards = () => {
  while (sharedMomentsArea.hasChildNodes()) {
    if (sharedMomentsArea.lastChild) {
      sharedMomentsArea.removeChild(sharedMomentsArea.lastChild)
    }
  }
}

const updateCardsUi = data => {
  clearCards()
  for (let i = 0; i < data.length; i++) {
    createCard(data[i])
  }
}

const setUpCardsUi = data => {
  const dataArray = []
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      dataArray.push(data[key])
    }
  }
  updateCardsUi(dataArray)
}

// From Web & Cache, use cache if get first and then update with latest one or simply use network one if get first/available
// make request to network and cache at same time

let networkResponseRecieved = false
// 1
fetch(urlToPostsApiGet)
  .then(function (res) {
    return res.json()
  })
  .then(function (data) {
    networkResponseRecieved = true
    setUpCardsUi(data)
  })

// 1
if (indexedDBAvailableInWindow) {
  readDataFromIndexDB(POSTS_DB_TABLE_NAME)
    .then(data => {
      if (!networkResponseRecieved) {
        updateCardsUi(data)
      }
    })
    .catch(err => {
      console.error(
        '[Feed.js] ERROR while getting data from indexedDB: err:',
        err
      )
    })
}

// unregister registered service workers
const unregisterServiceWorkers = () => {
  const unregisterButton = document.getElementById('unregister-service-worker')
  unregisterButton.addEventListener('click', () => {
    if (serviceWorkerAvailableInNavigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let i = 0; i < registrations.length; i++) {
          registrations[i].unregister()
        }
      })
    }
  })
}
