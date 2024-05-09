"use strict"
async function requestUserInfo() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getUserInfo" }, (response) => {
      resolve(response.userInfo.email);
    });
  });
}

// This function makes a request to your backend
function getYoutubeId() {
  // Get the current page URL
  const href = window.location.href;

  // Create a URL object
  const url = new URL(href);

  // Access the search parameters
  const searchParams = new URLSearchParams(url.search);

  // Get the YouTube video ID from the 'v' query parameter
  const videoId = searchParams.get("v");

  // Using regex:
  // const youtubeVideoIdRegex = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/
  // const match = searchParams.match(youtubeVideoIdRegex);
  // const videoId = match ? match[1] : '';
  // Check and use the video ID

  if (videoId) {
    console.log("YouTube Video ID:", videoId);
    return videoId;
  } else {
    console.log("No YouTube video ID found in the URL.");
    return false;
  }
}

let commentsSummery = [],
  topComments = [];

function injectSummeryDiv() {
  const commentsSummeryDiv = document.createElement("div");
  commentsSummeryDiv.id = "mycommentsSummeryDiv";
  commentsSummeryDiv.className = "modern-styling summery-container";

  const description = document.querySelector("#description.ytd-watch-metadata");
  const computedStyle = window.getComputedStyle(description);
  commentsSummeryDiv.style["margin"] = "12px 0 0 0";
  commentsSummeryDiv.style["background"] =
    computedStyle.getPropertyValue("background");
  commentsSummeryDiv.style["font-size"] =
    computedStyle.getPropertyValue("font-size");
  commentsSummeryDiv.style["font-family"] =
    computedStyle.getPropertyValue("font-family");
  commentsSummeryDiv.style["font-weight"] =
    computedStyle.getPropertyValue("font-size");
  commentsSummeryDiv.style["font-height"] =
    computedStyle.getPropertyValue("font-height");
  commentsSummeryDiv.style["font-color"] =
    computedStyle.getPropertyValue("font-color");
  commentsSummeryDiv.style["border-radius"] =
    computedStyle.getPropertyValue("border-radius");

  const element = document.querySelector("#bottom-row");
  element.insertAdjacentElement("afterend", commentsSummeryDiv);

  return commentsSummeryDiv;
}

async function fetchCommentsSummery() {
  const videoId = getYoutubeId();
  if (!videoId) {
    return false;
  }
  const baseUrl = "http://localhost:3000/";
  const url = baseUrl + "api/youtube/summerize/" + videoId;
  // let data = sessionStorage.getItem("userInfo");
  // let data = sessionStorage.setItem("userInfo", "userInfo");
  const email = await requestUserInfo();
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  };
  try {
    const response = await fetch(url, requestOptions);
    const clonedResponse = response.clone();
    const body = await clonedResponse.json();
    const { status } = clonedResponse;
    const formattedResponse = {
      body,
      status,
    };
    return formattedResponse;
  } catch (error) {
    console.log("Failed getting summery");
    return false;
  }
}

async function getCommentsList() {
  let innerHTML = "";
  try {
    const response = await fetchCommentsSummery();
    if (!response) {
      return false;
    }
    switch (response.status) {
      case 200: // Success
        const { commentsSummery, topComments } = response.body;
        commentsSummery.forEach((bulletPoint) => {
          innerHTML += `<li>${bulletPoint}</li>`;
        });
        break;

      case 401: // Unauthorized (User not logged in)
      case 403: // Forbidden (User not premium)
        innerHTML += response.body.responseText;
        innerHTML +=
          "<br/>       <a class='btn' href='http://localhost:3000/signin' target='_blank'>Go to website</a>";
        break;

      case 500: // Internal Server Error
      default:
        innerHTML = "Falied";
        break;
    }
  } catch (error) {
    innerHTML = "Falied";
  }

  return innerHTML;
}

async function injectCommentsSummery() {
  const commentsSummeryList = document.querySelector("#commentsSummeryList");
  commentsSummeryList.innerHTML = ''
  const image = document.createElement("img");
  image.classList.add("loading-gif");
  image.src = chrome.runtime.getURL("media/loading.gif");
  commentsSummeryList.appendChild(image)
  const commentsList = await getCommentsList();
  if (!commentsList) {
    return false;
  }
  const innerHTML = commentsList;
  commentsSummeryList.innerHTML = innerHTML;
  return true
}

async function addSummerySection() {
  const commentsSummeryDiv = injectSummeryDiv();
  const innerHTML = `<div id="description-inner">
                  <h3>Comments Summery</h3>
                  <ul id='commentsSummeryList'>
                  </ul> 
                </div>`;
  commentsSummeryDiv.innerHTML = innerHTML;
  return await injectCommentsSummery()
}

function initVideoChangeObserver(observer) {
  const target = document.querySelector("title");
  observer.observe(target, {
    attributes: true,
    childList: true,
    characterData: true,
  });
}

function initObservers() {
  const config = {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
    characterDataOldValue: true,
  };
  const observer2 = new MutationObserver(function (mutations) {
    console.log("title changed");
    injectCommentsSummery();
  });

  const observer1 = new MutationObserver((mutations, obs) => {
    const element = document.querySelector("#above-the-fold");
    if (element) {
      addSummerySection();
      initVideoChangeObserver(observer2);
      obs.disconnect();
    }
  });
  observer1.observe(document.body, config);
}

function main() {
  initObservers();
}

main();
