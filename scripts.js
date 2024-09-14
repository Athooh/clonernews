const API_BASE_URL = 'https://hacker-news.firebaseio.com/v0/';
let currentPostType = 'topstories';
let loadedPosts = 0;
const POSTS_PER_PAGE = 10;
let lastUpdateTime = Date.now();

const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

const fetchItem = async (id) => {
  const response = await axios.get(`${API_BASE_URL}item/${id}.json`);
  return response.data;
}

const fetchPosts = async (postType, start, end) => {
  const response = await axios.get(`${API_BASE_URL}${postType}.json`);
  const postIds = response.data.slice(start, end);
  return Promise.all(postIds.map(fetchItem));
}

const renderPost = (post) => {
  const postElement = document.createElement('div');
  postElement.className = 'post';
  postElement.innerHTML = `
    <h2><a href="${post.url || `https://news.ycombinator.com/item?id=${post.id}`}" target="_blank">${post.title}</a></h2>
    <p class="post-meta">By ${post.by} | ${new Date(post.time * 1000).toLocaleString()} | ${post.score} points</p>
    ${post.text ? `<p>${post.text}</p>` : ''}
    ${renderPostSpecificContent(post)}
    <a href="#" class="toggle-comments" data-id="${post.id}">Show Comments (${post.descendants || 0})</a>
    <div class="comments" id="comments-${post.id}"></div>
  `;
  return postElement;
}

const renderPostSpecificContent = (post) => {
  if (post.type === 'job') {
    return `<p><strong>Job Posting:</strong> ${post.text || 'No description available.'}</p>`;
  } else if (post.type === 'poll') {
    return renderPollContent(post);
  }
  return '';
}

const renderPollContent = (poll) => {
  if (!poll.parts || poll.parts.length === 0) return '';
  
  let pollContent = '<div class="poll-options">';
  poll.parts.forEach(optionId => {
    pollContent += `<div class="poll-option" id="poll-option-${optionId}">Loading option...</div>`;
  });
  pollContent += '</div>';
  
  // Load poll options asynchronously
  poll.parts.forEach(async (optionId) => {
    const option = await fetchItem(optionId);
    const optionElement = document.getElementById(`poll-option-${optionId}`);
    if (optionElement) {
      optionElement.innerHTML = `
        <p>${option.text}</p>
        <p class="poll-option-score">${option.score} votes</p>
      `;
    }
  });
  
  return pollContent;
}

const renderComment = (comment, depth = 0) => {
  if (comment.deleted || comment.dead) return '';
  const avatar = comment.by.charAt(0).toUpperCase();
  return `
    <div class="comment" style="margin-left: ${depth * 20}px;">
      <div class="comment-avatar">${avatar}</div>
      <div class="comment-content">
        <p class="post-meta">${comment.by}</p>
        <p>${comment.text}</p>
        <div class="comment-actions">
          <a href="#" class="like-comment">Like</a>
          <a href="#" class="reply-comment">Reply</a>
          ${comment.kids ? `<a href="#" class="toggle-replies" data-id="${comment.id}">Show Replies (${comment.kids.length})</a>` : ''}
        </div>
      </div>
      ${comment.kids ? `<div class="nested-comments" id="replies-${comment.id}"></div>` : ''}
    </div>
  `;
}

const loadComments = async (postId, commentContainer, depth = 0) => {
  const post = await fetchItem(postId);
  if (post.kids) {
    const comments = await Promise.all(post.kids.map(fetchItem));
    commentContainer.innerHTML = comments.map(comment => renderComment(comment, depth)).join('');
    commentContainer.addEventListener('click', handleCommentActions);
  }
}

const handleCommentActions = async (event) => {
  event.preventDefault();
  if (event.target.classList.contains('toggle-replies')) {
    const replyId = event.target.getAttribute('data-id');
    const replyContainer = document.getElementById(`replies-${replyId}`);
    if (replyContainer.innerHTML === '') {
      const reply = await fetchItem(replyId);
      if (reply.kids) {
        await loadComments(replyId, replyContainer, 1);
      }
      event.target.textContent = 'Hide Replies';
    } else {
      replyContainer.innerHTML = '';
      event.target.textContent = `Show Replies (${reply.kids.length})`;
    }
  }
}

const loadPosts = async () => {
  const posts = await fetchPosts(currentPostType, loadedPosts, loadedPosts + POSTS_PER_PAGE);
  const mainContent = document.getElementById('main-content');
  posts.forEach(post => {
    mainContent.appendChild(renderPost(post));
  });
  loadedPosts += POSTS_PER_PAGE;
}

const handleNavClick = (event) => {
  event.preventDefault();
  const clickedNav = event.target.id.split('-')[1];
  switch (clickedNav) {
    case 'jobs':
      currentPostType = 'jobstories';
      break;
    case 'polls':
      currentPostType = 'pollstories';
      break;
    case 'ask':
      currentPostType = 'askstories';
      break;
    case 'show':
      currentPostType = 'showstories';
      break;
    default:
      currentPostType = 'topstories';
  }
  document.getElementById('main-content').innerHTML = '';
  loadedPosts = 0;
  loadPosts();
}

const showNotification = (message) => {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

const checkForUpdates = async () => {
  const response = await axios.get(`${API_BASE_URL}updates.json`);
  const updates = response.data;
  
  if (updates.items.length > 0 || updates.profiles.length > 0) {
    const updateTime = Date.now();
    if (updateTime - lastUpdateTime >= 5000) {
      showNotification('New updates available!');
      lastUpdateTime = updateTime;
    }
    
    const updatesList = document.getElementById('live-updates-list');
    updatesList.innerHTML = '';
    updates.items.slice(0, 5).forEach(async (itemId) => {
      const item = await fetchItem(itemId);
      const li = document.createElement('li');
      li.textContent = `${item.type}: ${item.title || item.text}`;
      updatesList.appendChild(li);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  document.querySelectorAll('nav a').forEach(navItem => {
    navItem.addEventListener('click', handleNavClick);
  });
  document.getElementById('load-more').addEventListener('click', loadPosts);
  document.getElementById('main-content').addEventListener('click', async (event) => {
    if (event.target.classList.contains('toggle-comments')) {
      event.preventDefault();
      const postId = event.target.getAttribute('data-id');
      const commentContainer = document.getElementById(`comments-${postId}`);
      if (commentContainer.innerHTML === '') {
        await loadComments(postId, commentContainer);
        event.target.textContent = 'Hide Comments';
      } else {
        commentContainer.innerHTML = '';
        event.target.textContent = `Show Comments`;
      }
    }
  });

  setInterval(throttle(checkForUpdates, 5000), 5000);
});