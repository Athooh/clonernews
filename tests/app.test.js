// Import necessary modules and functions
const {describe, test, jest: requiredJest, expect} = require("@jest/globals");

const { 
    throttle, 
    fetchItem, 
    fetchPosts, 
    renderPost, 
    renderPostSpecificContent, 
    renderPollContent, 
    renderComment, 
    loadComments, 
    handleCommentActions, 
    loadPosts, 
    handleNavClick, 
    showNotification, 
    checkForUpdates, 
    fetchSidebarPosts 
} = require('../src/clonernews');

describe('App Functions', () => {
  
  // Test for throttle function
  describe('throttle', () => {
    it('should throttle function calls', () => {
      jest.useFakeTimers();
      const mockFunction = jest.fn();
      const throttledFunction = throttle(mockFunction, 1000);

      throttledFunction();
      throttledFunction();
      throttledFunction();

      expect(mockFunction).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      throttledFunction();
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });
  });

  // Test for fetchItem function
  describe('fetchItem', () => {
    it('should fetch item from API', async () => {
      const mockData = { id: 1, title: 'Test Item' };
      axios.get.mockResolvedValue({ data: mockData });

      const result = await fetchItem(1);
      expect(result).toEqual(mockData);
      expect(axios.get).toHaveBeenCalledWith('https://hacker-news.firebaseio.com/v0/item/1.json');
    });
  });

  // Test for fetchPosts function
  describe('fetchPosts', () => {
    it('should fetch posts from API', async () => {
      const mockPostIds = [1, 2, 3];
      const mockPosts = [{ id: 1 }, { id: 2 }, { id: 3 }];
      jest.get.mockResolvedValue({ data: mockPostIds });

      jest.spyOn(global, 'fetchItem').mockResolvedValueOnce(mockPosts[0])
                                    .mockResolvedValueOnce(mockPosts[1])
                                    .mockResolvedValueOnce(mockPosts[2]);

      const result = await fetchPosts('topstories', 0, 3);
      expect(result).toEqual(mockPosts);
      expect(axios.get).toHaveBeenCalledWith('https://hacker-news.firebaseio.com/v0/topstories.json');
    });
  });

  // Test for renderPost function
  describe('renderPost', () => {
    it('should render a post as HTML', () => {
      const post = {
        id: 1,
        url: 'http://example.com',
        title: 'Test Post',
        by: 'Author',
        time: 1633055462,
        score: 100,
        text: 'Some post content',
        descendants: 10
      };

      const result = renderPost(post);
      expect(result).toContain('<h2><a href="http://example.com" target="_blank">Test Post</a></h2>');
      expect(result).toContain('By Author |');
      expect(result).toContain('100 points');
    });
  });

  // Test for renderPostSpecificContent function
  describe('renderPostSpecificContent', () => {
    it('should render specific content based on post type', () => {
      const jobPost = { type: 'job', text: 'Job description' };
      const pollPost = { type: 'poll', parts: [1, 2] };

      expect(renderPostSpecificContent(jobPost)).toContain('Job Posting: Job description');
      expect(renderPostSpecificContent(pollPost)).toContain('Loading option...');
    });
  });

  // Test for renderPollContent function
  describe('renderPollContent', () => {
    it('should render poll options and load them asynchronously', async () => {
      const poll = { parts: [1, 2] };
      const mockOptions = [{ id: 1, text: 'Option 1', score: 10 }, { id: 2, text: 'Option 2', score: 20 }];

      axios.get.mockResolvedValueOnce({ data: mockOptions[0] })
             .mockResolvedValueOnce({ data: mockOptions[1] });

      const result = renderPollContent(poll);
      expect(result).toContain('Loading option...');
      await new Promise(r => setTimeout(r, 0)); // Allow async operations to complete
      expect(result).toContain('Option 1');
      expect(result).toContain('Option 2');
    });
  });

  // Test for renderComment function
  describe('renderComment', () => {
    it('should render a comment as HTML', () => {
      const comment = {
        by: 'Author',
        text: 'Comment text',
        kids: [2]
      };

      const result = renderComment(comment, 1);
      expect(result).toContain('Author');
      expect(result).toContain('Comment text');
    });
  });

  // Test for loadComments function
  describe('loadComments', () => {
    it('should load and render comments', async () => {
      const postId = 1;
      const mockComments = [{ id: 2, text: 'Comment 1' }, { id: 3, text: 'Comment 2' }];
      const commentContainer = { innerHTML: '', addEventListener: jest.fn() };

      axios.get.mockResolvedValueOnce({ data: { kids: [2, 3] } });
      jest.spyOn(global, 'fetchItem').mockResolvedValueOnce(mockComments[0])
                                    .mockResolvedValueOnce(mockComments[1]);

      await loadComments(postId, commentContainer);
      expect(commentContainer.innerHTML).toContain('Comment 1');
      expect(commentContainer.innerHTML).toContain('Comment 2');
    });
  });

  // Test for handleCommentActions function
  describe('handleCommentActions', () => {
    it('should handle comment and reply actions correctly', async () => {
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: { classList: { contains: jest.fn().mockReturnValue(true) }, getAttribute: jest.fn().mockReturnValue(1), textContent: '' }
      };
      const commentContainer = { innerHTML: '', id: 'replies-1' };

      jest.spyOn(global, 'fetchItem').mockResolvedValue({ kids: [] });
      jest.spyOn(global, 'loadComments').mockResolvedValue();

      await handleCommentActions(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  // Test for loadPosts function
  describe('loadPosts', () => {
    it('should load and render posts', async () => {
      const mockPosts = [{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }];
      axios.get.mockResolvedValueOnce({ data: [1, 2] });
      jest.spyOn(global, 'fetchItem').mockResolvedValueOnce(mockPosts[0])
                                    .mockResolvedValueOnce(mockPosts[1]);

      document.getElementById = jest.fn().mockReturnValue({ appendChild: jest.fn() });
      await loadPosts();
      expect(document.getElementById).toHaveBeenCalledWith('main-content');
    });
  });

  // Test for handleNavClick function
  describe('handleNavClick', () => {
    it('should handle navigation click and update posts', async () => {
      const event = {
        preventDefault: jest.fn(),
        target: { id: 'nav-jobs' }
      };
      jest.spyOn(global, 'loadPosts').mockResolvedValue();

      await handleNavClick(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(loadPosts).toHaveBeenCalled();
    });
  });

  // Test for showNotification function
  describe('showNotification', () => {
    it('should display a notification', () => {
      const notification = { textContent: '', style: { display: '' } };
      document.getElementById = jest.fn().mockReturnValue(notification);

      showNotification('Test message');
      expect(notification.textContent).toBe('Test message');
      expect(notification.style.display).toBe('block');
    });
  });

  // Test for checkForUpdates function
  describe('checkForUpdates', () => {
    it('should check for updates and show notification if updates are available', async () => {
      const updates = { items: [1], profiles: [] };
      axios.get.mockResolvedValueOnce({ data: updates });

      jest.spyOn(global, 'showNotification').mockImplementation();
      jest.spyOn(global, 'fetchItem').mockResolvedValue({ id: 1, title: 'New Post' });

      await checkForUpdates();
      expect(showNotification).toHaveBeenCalledWith('New updates available!');
    });
  });

  // Test for fetchSidebarPosts function
  describe('fetchSidebarPosts', () => {
    it('should fetch and display sidebar posts', async () => {
      const mockPosts = [{ id: 1, title: 'Sidebar Post 1', url: 'http://example.com' }];
      axios.get.mockResolvedValueOnce({ data: [1] });
      jest.spyOn(global, 'fetchItem').mockResolvedValueOnce(mockPosts[0]);

      const list = { innerHTML: '' };
      document.getElementById = jest.fn().mockReturnValue(list);

      await fetchSidebarPosts('topstories');
      expect(list.innerHTML).toContain('<a href="http://example.com" target="_blank">Sidebar Post 1</a>');
    });
  });

});
