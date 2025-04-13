class ScriptManager {
    constructor() {
        this.scripts = new Map();
        this.currentChannel = null;
        this.scriptHistory = new Map(); // Store script versions for iterative development
        this.geminiEndpoint = '/gemini'; // Endpoint for Gemini API
    }

    async generateScript(request, channel) {
        try {
            // Store current context
            this.currentChannel = channel;

            // Prepare the prompt for Gemini
            const prompt = {
                role: 'system',
                content: `Generate a JavaScript script for the Tag Me In platform based on this request: "${request}".
                         The script should be compatible with a simplified environment that provides:
                         - Basic UI elements (div, button, input)
                         - Data access through localStorage
                         - Event handling
                         - DOM manipulation
                         Ensure the script is secure, efficient, and follows best practices.`
            };

            // Call Gemini API
            const response = await fetch(this.geminiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [prompt],
                    channel: channel
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate script');
            }

            const data = await response.json();
            const generatedScript = this.processGeminiResponse(data);

            // Store the script
            const scriptId = Date.now().toString();
            this.scripts.set(scriptId, {
                code: generatedScript,
                channel: channel,
                request: request,
                versions: [{
                    code: generatedScript,
                    timestamp: new Date().toISOString(),
                    description: 'Initial version'
                }]
            });

            // Install the script
            await this.installScript(scriptId);

            return {
                scriptId: scriptId,
                code: generatedScript
            };
        } catch (error) {
            console.error('Error generating script:', error);
            throw error;
        }
    }

    async installScript(scriptId) {
        const script = this.scripts.get(scriptId);
        if (!script) {
            throw new Error('Script not found');
        }

        try {
            // Create a container for the script
            const container = document.createElement('div');
            container.id = `script-container-${scriptId}`;
            container.className = 'tagme-script-container';

            // Create script element
            const scriptElement = document.createElement('script');
            scriptElement.id = `script-${scriptId}`;
            scriptElement.type = 'text/javascript';

            // Add safety wrapper around the script
            scriptElement.textContent = `
                (function() {
                    try {
                        // Script isolation wrapper
                        const scriptContext = {
                            container: document.getElementById('script-container-${scriptId}'),
                            localStorage: {
                                getItem: (key) => localStorage.getItem('script_${scriptId}_' + key),
                                setItem: (key, value) => localStorage.setItem('script_${scriptId}_' + key, value),
                                removeItem: (key) => localStorage.removeItem('script_${scriptId}_' + key)
                            },
                            scriptId: '${scriptId}'
                        };

                        ${script.code}
                    } catch (error) {
                        console.error('Script execution error:', error);
                        document.getElementById('script-container-${scriptId}').innerHTML = 
                            '<div class="script-error">Error: ' + error.message + '</div>';
                    }
                })();
            `;

            // Add container to the channel
            const channelContainer = document.querySelector(`[data-channel="${script.channel}"]`);
            if (channelContainer) {
                channelContainer.appendChild(container);
                container.appendChild(scriptElement);
            } else {
                throw new Error('Channel container not found');
            }

            return true;
        } catch (error) {
            console.error('Error installing script:', error);
            throw error;
        }
    }

    async updateScript(scriptId, request) {
        const script = this.scripts.get(scriptId);
        if (!script) {
            throw new Error('Script not found');
        }

        try {
            // Prepare the prompt for Gemini with context
            const prompt = {
                role: 'system',
                content: `Update this JavaScript script based on the following request: "${request}".
                         Current script:
                         ${script.code}
                         
                         Previous request:
                         ${script.request}
                         
                         Maintain compatibility with the Tag Me In platform and ensure all existing functionality remains intact.`
            };

            // Call Gemini API
            const response = await fetch(this.geminiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [prompt],
                    channel: script.channel
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update script');
            }

            const data = await response.json();
            const updatedScript = this.processGeminiResponse(data);

            // Store the new version
            script.versions.push({
                code: updatedScript,
                timestamp: new Date().toISOString(),
                description: request
            });
            script.code = updatedScript;
            script.request = request;

            // Reinstall the updated script
            await this.reinstallScript(scriptId);

            return {
                scriptId: scriptId,
                code: updatedScript
            };
        } catch (error) {
            console.error('Error updating script:', error);
            throw error;
        }
    }

    async reinstallScript(scriptId) {
        // Remove existing script container
        const existingContainer = document.getElementById(`script-container-${scriptId}`);
        if (existingContainer) {
            existingContainer.remove();
        }

        // Install updated script
        return await this.installScript(scriptId);
    }

    processGeminiResponse(response) {
        // Extract code from Gemini response
        // Assuming response contains a code block or structured data
        if (response.code) {
            return response.code;
        } else if (response.text) {
            // Extract code from markdown-style response
            const codeMatch = response.text.match(/```javascript\n([\s\S]*?)\n```/);
            if (codeMatch) {
                return codeMatch[1];
            }
        }
        return response.text || '';
    }

    getScriptHistory(scriptId) {
        const script = this.scripts.get(scriptId);
        if (!script) {
            throw new Error('Script not found');
        }
        return script.versions;
    }

    rollbackScript(scriptId, versionIndex) {
        const script = this.scripts.get(scriptId);
        if (!script || !script.versions[versionIndex]) {
            throw new Error('Script or version not found');
        }

        script.code = script.versions[versionIndex].code;
        return this.reinstallScript(scriptId);
    }
}

// Add styles for script containers
const style = document.createElement('style');
style.textContent = `
    .tagme-script-container {
        margin: 10px 0;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: white;
    }

    .script-error {
        color: #ff4444;
        padding: 10px;
        background: #ffebee;
        border-radius: 4px;
        margin: 5px 0;
    }
`;
document.head.appendChild(style);

// Export for global use
window.scriptManager = new ScriptManager(); 