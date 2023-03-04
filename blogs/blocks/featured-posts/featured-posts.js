import { getPosts, execDeferred } from '../../scripts/scripts.js';
import { createOptimizedPicture } from '../../scripts/lib-franklin.js';
/**
 * decorates the block
 * @param {Element} block The featured posts block element
 */
export default async function decorate(block) {
  const postsGrid = block.querySelector('div');
  postsGrid.classList.add('featured-posts-grid');

  const featuredPosts = [...postsGrid.children].map((post) => {
    post.classList.add('post', 'post-placeholder');

    const heading = post.querySelector('p > strong');
    const link = post.querySelector('p > a');

    post.innerHTML = `
        <a href="#"><div class="picture-placeholder"></div></a>
        <div>
          <p class="category">${heading.textContent}</p>
          <a href="#"></a>
        </div>
    `;

    return {
      title: heading.textContent,
      url: link.href,
    };
  });

  execDeferred(async () => {
    const pages = await getPosts('none', -1);
    const filteredPages = await getPosts('auto', -1);

    let notFoundCounter = 0;
    featuredPosts.forEach((post) => {
      const postElem = block.querySelector('.post-placeholder');
      let pageForLink = pages.find((page) => page.path === new URL(post.url).pathname);
      if (!pageForLink) {
        /*
           in most normal cases this should only happen for the "most recent" section
          so we are just getting the first post
          in the scenarion that a different post isn't linked properly or is somehow not found
          the counter guarantees that different posts get highlighted
          instead of showing the most recent post multiple times
          we also use the filtered pages here
          to ensure the link comes from the right section of the site
        */
        pageForLink = filteredPages[notFoundCounter];
        notFoundCounter += 1;
      }

      if (pageForLink) {
        const pic = createOptimizedPicture(pageForLink.image, '', false, [{ width: '200' }]);
        postElem.innerHTML = `
        <a href="${pageForLink.path}" title="${pageForLink.title.replaceAll('"', '')}">${pic.outerHTML}</a>
        <div>
          <p class="category">${post.title}</p>
          <a href="${pageForLink.path}">${pageForLink.title}</a>
        </div>
      `;
        postElem.classList.remove('post-placeholder');
      } else {
        post.remove();
      }
    });
  });
}
