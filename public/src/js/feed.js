// On demand cache approache
const cachesAvailableInWindow = 'caches' in window
const urlToPost = 'https://httpbin.org/get'
const urlToPostImage = '/src/images/sf-boat.jpg'

const shareImageButton = document.querySelector('#share-image-button')
const createPostArea = document.querySelector('#create-post')
const closeCreatePostModalButton = document.querySelector(
  '#close-create-post-modal-btn'
)
const sharedMomentsArea = document.querySelector('#shared-moments')

function openCreatePostModal () {
  createPostArea.style.display = 'block'

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
  createPostArea.style.display = 'none'
}

shareImageButton.addEventListener('click', openCreatePostModal)

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal)

function createCard () {
  const cardWrapper = document.createElement('div')
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp'

  const cardTitle = document.createElement('div')
  cardTitle.className = 'mdl-card__title'
  cardTitle.style.backgroundImage = `url(${urlToPostImage})`
  cardTitle.style.backgroundSize = 'cover'
  cardTitle.style.height = '180px'
  cardWrapper.appendChild(cardTitle)

  const cardTitleTextElement = document.createElement('h2')
  cardTitleTextElement.className = 'mdl-card__title-text'
  cardTitleTextElement.textContent = 'San Francisco Trip'
  cardTitleTextElement.style.color = 'white'
  cardTitle.appendChild(cardTitleTextElement)

  const cardSupportingText = document.createElement('div')
  cardSupportingText.className = 'mdl-card__supporting-text'
  cardSupportingText.textContent = 'In San Francisco'
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

// From Web & Cache, use cache if get first and then update with latest one or simply use network one if get first/available
// make request to network and cache at same time

let networkResponseRecieved = false
// 1
fetch(urlToPost)
  .then(function (res) {
    return res.json()
  })
  .then(function (data) {
    networkResponseRecieved = true
    clearCards()
    createCard()
  })

// 1
if (cachesAvailableInWindow) {
  caches
    .match(urlToPost)
    .then(res => {
      if (res) {
        return res.json() // because we store complete response in SW, so here we will first get json data, we will convert it first although we never use it but just so we follow each step
      }
    })
    .then(data => {
      if (!networkResponseRecieved) {
        clearCards()
        createCard()
      }
    })
}

// unregister registered service workers
const unregisterServiceWorkers = () => {
  const unregisterButton = document.getElementById('unregister-service-worker')
  unregisterButton.addEventListener('click', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let i = 0; i < registrations.length; i++) {
          registrations[i].unregister()
        }
      })
    }
  })
}
