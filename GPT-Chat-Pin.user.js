// ==UserScript==
// @name         GPT Chat Pin
// @namespace    github.com/longkidkoolstar
// @version      1.0.0
// @description  Add a favorite icon to chatgpt.com conversations.
// @author       longkidkoolstar
// @license      none
// @match        https://chatgpt.com/*
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.listValues

// ==/UserScript==

(function() {
    'use strict';
    console.log('GPT Chat Pin script loaded');
    // Add CSS styles with dark mode support
    const styles = `
        #favorite-chats-section {
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            padding: 12px 16px;
            margin: 10px 0;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            transition: background-color 0.3s, box-shadow 0.3s;
        }
        
        .dark #favorite-chats-section {
            background-color: rgba(255, 255, 255, 0.05);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        
        #favorite-chats-section h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 600;
            color: #202123;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .dark #favorite-chats-section h3 {
            color: #d1d5db;
        }
        
        #favorite-chats-section ul {
            list-style-type: none;
            margin: 0;
            padding: 0;
        }
        
        #favorite-chats-section li {
            margin: 6px 0;
            padding: 4px 0;
            display: flex;
            align-items: center;
        }
        
        #favorite-chats-section a {
            color: #202123;
            text-decoration: none;
            font-size: 14px;
            display: flex;
            align-items: center;
            width: 100%;
            padding: 6px 10px;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        
        .dark #favorite-chats-section a {
            color: #d1d5db;
        }
        
        #favorite-chats-section a:hover {
            background-color: rgba(0, 0, 0, 0.1);
            transform: translateX(2px);
        }
        
        .dark #favorite-chats-section a:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        #favorite-chats-section a::before {
            content: '⭐';
            margin-right: 8px;
            font-size: 14px;
        }
        
        .favorite-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            transition: all 0.2s ease;
            position: relative;
        }
        
        .favorite-icon:hover {
            background-color: rgba(0, 0, 0, 0.1);
            transform: scale(1.2);
        }
        
        .dark .favorite-icon:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .favorite-icon.active {
            color: #ffb400;
        }
        
        .dark .favorite-icon.active {
            color: #ffd700;
        }
    `;
    
    // Add styles to document
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Function to add the favorite icon to individual chat links
    function addFavoriteIcon() {
        const chatLinks = document.querySelectorAll("a[href^='/c/']"); // Select all chat links

        chatLinks.forEach(targetElement => {
            if (targetElement && !targetElement.querySelector('.favorite-icon')) {
            const chatId = targetElement.href.split('/').pop(); // Assuming chat ID is the last part of the URL
            const favoriteIcon = document.createElement('span');
            favoriteIcon.classList.add('favorite-icon');
            favoriteIcon.style.cursor = 'pointer';
            favoriteIcon.style.marginLeft = '8px';
            favoriteIcon.style.fontSize = '16px';

            // Check initial favorite state
            GM.getValue(`favorite_chat_${chatId}`, false).then(isFavorited => {
                favoriteIcon.textContent = isFavorited ? '⭐' : '☆'; // Star emoji for favorited, outline star for unfavorited
                if (isFavorited) {
                    favoriteIcon.classList.add('active');
                } else {
                    favoriteIcon.classList.remove('active');
                }
            });

            favoriteIcon.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent event bubbling
                event.preventDefault(); // Prevent navigation when clicking the icon
                GM.getValue(`favorite_chat_${chatId}`, false).then(isFavorited => {
                    const newState = !isFavorited;
                    let chatTitle = '';

                    if (newState) {
                        // Extract the chat title from the link text
                        chatTitle = targetElement.textContent.trim();
                        // Remove any emoji or special characters that might be part of the favorite icon
                        chatTitle = chatTitle.replace(/[⭐☆]/g, '').trim();
                    }

                    if (newState) {
                        // If favoriting, set the value
                        GM.setValue(`favorite_chat_${chatId}`, { isFavorited: newState, title: chatTitle }).then(() => {
                            favoriteIcon.textContent = '⭐';
                            favoriteIcon.classList.add('active');
                            console.log(`Chat ${chatId} favorited with title: ${chatTitle}`);
                            displayFavoritedChats(); // Update favorite list
                        });
                    } else {
                        // If unfavoriting, remove the value
                        GM.deleteValue(`favorite_chat_${chatId}`).then(() => {
                            favoriteIcon.textContent = '☆';
                            favoriteIcon.classList.remove('active');
                            console.log(`Chat ${chatId} unfavorited and removed from storage`);
                            displayFavoritedChats(); // Update favorite list
                        });
                    }
                });
            });

            targetElement.appendChild(favoriteIcon);
        }
        });
    }

    // Observe changes in the DOM to add the icon when new chat links are added
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                addFavoriteIcon();
                break; // Only need to run once per mutation batch
            }
        }
    });

    // Start observing the element that contains the chat history for childList changes
    // This is more efficient than observing the entire document.body
    const historyAside = document.querySelector("#history > aside:nth-child(1)");
    if (historyAside) {
        observer.observe(historyAside, { childList: true, subtree: true });
    } else {
        // Fallback to observing body if the specific history element isn't immediately available
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Function to display favorited chats
    async function displayFavoritedChats() {
        const historyElement = document.querySelector("#history");
        if (!historyElement) return;

        let favoriteSection = document.querySelector("#favorite-chats-section");
        if (!favoriteSection) {
            favoriteSection = document.createElement('div');
            favoriteSection.id = 'favorite-chats-section';
            historyElement.parentNode.insertBefore(favoriteSection, historyElement);
        }
        favoriteSection.innerHTML = '<h3><span style="color: #ffb400;">⭐</span> Favorite Chats</h3>'; // Clear and add title with star icon

        const allKeys = await GM.listValues();
        const favoriteChatKeys = allKeys.filter(key => key.startsWith('favorite_chat_') && !key.startsWith('favorite_chat_title_'));

        if (favoriteChatKeys.length === 0) {
            favoriteSection.innerHTML += '<p style="color: #6e6e80; font-size: 14px; font-style: italic; margin: 8px 0;">No favorite chats yet.</p>';
            return;
        }

        const ul = document.createElement('ul');
        for (const key of favoriteChatKeys) {
            const favoriteData = await GM.getValue(key, null);
            if (favoriteData && favoriteData.isFavorited) {
                const chatId = key.replace('favorite_chat_', '');
                let chatTitle = favoriteData.title;
                
                // If title is empty, try to get it from the sidebar
                if (!chatTitle) {
                    const existingLink = document.querySelector(`a[href='/c/${chatId}']`);
                    if (existingLink && existingLink.textContent.trim()) {
                        const linkText = existingLink.textContent.trim();
                        chatTitle = linkText.replace(/[⭐☆]/g, '').trim();
                        // Update the stored data with the found title
                        GM.setValue(key, { isFavorited: true, title: chatTitle });
                    } else {
                        chatTitle = `Chat ${chatId}`;
                    }
                }
                const li = document.createElement('li');
                const link = document.createElement('a');
                link.href = `/c/${chatId}`;
                link.textContent = chatTitle;
                li.appendChild(link);
                ul.appendChild(li);
            }
        }
        favoriteSection.appendChild(ul);
    }

    // Initial calls and observation
    addFavoriteIcon();
    displayFavoritedChats();

    // Check for dark mode and apply appropriate class
    function checkDarkMode() {
        // Different ways to detect dark mode
        const isDarkMode = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
    
    // Periodically check for new chat elements, update favorites, and check dark mode
    setInterval(() => {
        addFavoriteIcon();
        displayFavoritedChats();
        checkDarkMode();
    }, 2000); // Check every 2 seconds
    
    // Initial dark mode check
    checkDarkMode();
})();