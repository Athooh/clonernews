// scripts.js
document.addEventListener("DOMContentLoaded", () => {
    const newsList = document.getElementById("news-list");
    const loadMoreBtn = document.getElementById("load-more");
    const liveUpdatesBanner = document.getElementById("live-updates-banner");
    const refreshBtn = document.getElementById("refresh-btn");
    let currentPostIndex = 0;
    const postsPerPage = 5;
    let topStoryIds = [];
    let latestPostId = null;
  
    liveUpdatesBanner.style.display = 'none'; // Hide banner initially
  
    // Fetch top stories initially
    function fetchTopStories() {
      fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
        .then(response => response.json())
        .then(storyIds => {
          topStoryIds = storyIds;
          latestPostId = topStoryIds[0]; // Record the latest post
          loadMorePosts();
        })
        .catch(error => console.error("Error fetching top stories:", error));
    }
  
    // Fetch individual post details
    function fetchPostDetails(id) {
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then(response => response.json())
        .then(post => {
          displayPost(post);
        })
        .catch(error => console.error("Error fetching post:", error));
    }
  
    // Display post in HTML
    function displayPost(post) {
      const postItem = document.createElement("li");
      postItem.innerHTML = `
        <a href="${post.url}" target="_blank">${post.title}</a>
        <p>By: ${post.by} | Points: ${post.score} | ${post.descendants || 0} comments</p>
        <div class="comment-section">
          ${getLatestComment(post)}
          <span id="see-more-comments" class="comment-toggle" data-post-id="${post.id}">See more comments</span>
        </div>
      `;
      newsList.appendChild(postItem);
  
      // "See more comments" event
      const toggleLink = postItem.querySelector("#see-more-comments");
      toggleLink.addEventListener("click", function () {
        const postId = this.getAttribute("data-post-id");
        if (toggleLink.innerText === "See more comments") {
          fetchMoreComments(postId, postItem);
        } else {
          minimizeComments(postItem);
        }
      });
    }
  
    // Get the latest comment (if any)
    function getLatestComment(post) {
      if (post.kids && post.kids.length > 0) {
        return `<div class="comment" id="comment-${post.id}">
                  <div class="comment-header">
                    <span class="author">Author</span>
                    <span class="timestamp">Just now</span>
                  </div>
                  <p>This is a sample comment</p>
                </div>`;
      }
      return '';
    }
  
    // Fetch more comments and append them
    function fetchMoreComments(postId, postItem) {
      fetch(`https://hacker-news.firebaseio.com/v0/item/${postId}.json`)
        .then(response => response.json())
        .then(post => {
          post.kids.forEach(commentId => fetchComment(commentId, postItem));
          // Change "See more comments" to "Minimize comments"
          const toggleLink = postItem.querySelector("#see-more-comments");
          toggleLink.innerText = "Minimize comments";
        });
    }
  
    // Fetch comment details
    function fetchComment(commentId, postItem) {
      fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`)
        .then(response => response.json())
        .then(comment => {
          const commentHTML = `
            <div class="comment additional-comment">
              <div class="comment-header">
                <span class="author">${comment.by}</span>
                <span class="timestamp">${new Date(comment.time * 1000).toLocaleTimeString()}</span>
              </div>
              <p>${comment.text}</p>
            </div>
          `;
          postItem.querySelector(".comment-section").insertAdjacentHTML('beforeend', commentHTML);
        });
    }
  
    // Minimize comments, showing only the latest one
    function minimizeComments(postItem) {
      // Remove all additional comments
      const additionalComments = postItem.querySelectorAll(".additional-comment");
      additionalComments.forEach(comment => comment.remove());
  
      // Change "Minimize comments" back to "See more comments"
      const toggleLink = postItem.querySelector("#see-more-comments");
      toggleLink.innerText = "See more comments";
    }
  
    // Load more posts on button click
    loadMoreBtn.addEventListener("click", loadMorePosts);
  
    // Load more posts function
    function loadMorePosts() {
      for (let i = currentPostIndex; i < currentPostIndex + postsPerPage; i++) {
        if (i >= topStoryIds.length) break;
        fetchPostDetails(topStoryIds[i]);
      }
      currentPostIndex += postsPerPage;
    }
  
    // Poll for new posts every 5 seconds
    function pollForNewPosts() {
      setInterval(() => {
        fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
          .then(response => response.json())
          .then(storyIds => {
            if (storyIds[0] !== latestPostId) {
              // If new posts are available, show the banner
              latestPostId = storyIds[0];
              liveUpdatesBanner.style.display = 'block'; // Show live updates banner
            }
          })
          .catch(error => console.error("Error fetching live updates:", error));
      }, 5000);
    }
  
    // Refresh to load new posts
    refreshBtn.addEventListener("click", () => {
      liveUpdatesBanner.style.display = 'none'; // Hide banner after refresh
      newsList.innerHTML = ''; // Clear the current list
      currentPostIndex = 0;
      fetchTopStories(); // Reload posts
    });
  
    // Initial load
    fetchTopStories();
    pollForNewPosts();
  });
  