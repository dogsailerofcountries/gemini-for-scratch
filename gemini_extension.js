(function(Scratch) {
  'use strict';

  class GeminiExtension {
    constructor() {
      this.apiKeys = {};
      this.chats = {};
    }

    getInfo() {
      return {
        id: 'geminiapi',
        name: 'Gemini AI',
        color1: '#4285F4',
        color2: '#0F52BA',
        blocks: [
          {
            opcode: 'setApiKey',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set API key [KEY] as [NAME]',
            arguments: {
              KEY: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'AIzaSy...'
              },
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'default'
              }
            }
          },
          {
            opcode: 'createChat',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Create chat [NAME] using key [KEY_NAME] with system prompt [PROMPT]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'chat1'
              },
              KEY_NAME: {
                type: Scratch.ArgumentType.STRING,
                menu: 'apiKeyNames',
                defaultValue: 'default'
              },
              PROMPT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'You are a helpful assistant.'
              }
            }
          },
          {
            opcode: 'changeSystemPrompt',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Change system prompt of chat [CHAT_NAME] to [PROMPT]',
            arguments: {
              CHAT_NAME: {
                type: Scratch.ArgumentType.STRING,
                menu: 'chatNames',
                defaultValue: 'chat1'
              },
              PROMPT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'You are an expert coder.'
              }
            }
          },
          {
            opcode: 'retrieveAnswer',
            blockType: Scratch.BlockType.REPORTER,
            text: 'Retrieve answer for [PROMPT] from chat [CHAT_NAME] using model [MODEL]',
            disableMonitor: true,
            arguments: {
              PROMPT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'What is Scratch?'
              },
              CHAT_NAME: {
                type: Scratch.ArgumentType.STRING,
                menu: 'chatNames',
                defaultValue: 'chat1'
              },
              MODEL: {
                type: Scratch.ArgumentType.STRING,
                menu: 'models',
                defaultValue: 'gemini-1.5-flash'
              }
            }
          }
        ],
        menus: {
          apiKeyNames: {
            acceptReporters: true,
            items: '_getApiKeyNames'
          },
          chatNames: {
            acceptReporters: true,
            items: '_getChatNames'
          },
          models: {
            acceptReporters: true,
            items: [
              'gemini-1.5-flash',
              'gemini-1.5-flash-8b',
              'gemini-1.5-pro',
              'gemini-2.0-flash-exp',
              'gemma-2-2b-it',
              'gemma-2-9b-it',
              'gemma-2-27b-it'
            ]
          }
        }
      };
    }

    _getApiKeyNames() {
      const keys = Object.keys(this.apiKeys);
      if (keys.length === 0) return ['default'];
      return keys;
    }

    _getChatNames() {
      const names = Object.keys(this.chats);
      if (names.length === 0) return ['chat1'];
      return names;
    }

    setApiKey(args) {
      const key = Scratch.Cast.toString(args.KEY);
      const name = Scratch.Cast.toString(args.NAME);
      this.apiKeys[name] = key;
    }

    createChat(args) {
      const name = Scratch.Cast.toString(args.NAME);
      const keyName = Scratch.Cast.toString(args.KEY_NAME);
      const prompt = Scratch.Cast.toString(args.PROMPT);

      this.chats[name] = {
        keyName: keyName,
        systemPrompt: prompt,
        history: []
      };
    }

    changeSystemPrompt(args) {
      const chatName = Scratch.Cast.toString(args.CHAT_NAME);
      const prompt = Scratch.Cast.toString(args.PROMPT);

      if (this.chats[chatName]) {
        this.chats[chatName].systemPrompt = prompt;
      }
    }

    async retrieveAnswer(args) {
      const prompt = Scratch.Cast.toString(args.PROMPT);
      const chatName = Scratch.Cast.toString(args.CHAT_NAME);
      const model = Scratch.Cast.toString(args.MODEL);

      const chat = this.chats[chatName];
      if (!chat) {
        return 'Error: Chat not found';
      }

      const apiKey = this.apiKeys[chat.keyName];
      if (!apiKey) {
        return 'Error: API key not found';
      }

      // Prepare request payload
      const payload = {
        contents: [
          ...chat.history,
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      };

      if (chat.systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: chat.systemPrompt }]
        };
      }

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.error && data.error.message) {
            return `Error: ${data.error.message}`;
          }
          return `Error: API request failed with status ${response.status}`;
        }

        if (data.candidates && data.candidates.length > 0) {
          const candidate = data.candidates[0];

          if (candidate.finishReason === 'SAFETY') {
            return 'Error: Blocked due to safety settings';
          }

          const text = candidate.content.parts[0].text;

          // Append to history
          chat.history.push({
            role: 'user',
            parts: [{ text: prompt }]
          });

          chat.history.push({
            role: 'model',
            parts: [{ text: text }]
          });

          return text;
        } else {
          return 'Error: No answer generated';
        }

      } catch (err) {
        return `Error: ${err.message}`;
      }
    }
  }

  Scratch.extensions.register(new GeminiExtension());
})(Scratch);
