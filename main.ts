import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, TextComponent } from 'obsidian';

// MCP types
interface McpResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}

interface McpClient {
    useTool(serverName: string, toolName: string, args: any): Promise<McpResponse>;
}

declare global {
    interface Window {
        mcp: McpClient;
    }
}

interface SocialPostsSettings {
    mcpServerName: string;
}

const DEFAULT_SETTINGS: SocialPostsSettings = {
    mcpServerName: 'linkedin'
};

export default class SocialPostsPlugin extends Plugin {
    settings: SocialPostsSettings;
    app: App;

    override async onload(): Promise<void> {
        await this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('share-2', 'Post to LinkedIn', async () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                new Notice('No active markdown view');
                return;
            }

            const content = activeView.getViewData();
            await this.postToLinkedIn(content);
        });

        // Add command
        this.addCommand({
            id: 'post-to-linkedin',
            name: 'Post current note to LinkedIn',
            editorCallback: async (editor: Editor) => {
                const content = editor.getValue();
                await this.postToLinkedIn(content);
            }
        });

        // Add settings tab
        this.addSettingTab(new SocialPostsSettingTab(this.app, this));
    }

    async postToLinkedIn(content: string): Promise<void> {
        try {
            // Use MCP to post to LinkedIn
            const response = await window.mcp.useTool(
                this.settings.mcpServerName,
                'post_to_linkedin',
                {
                    text: content,
                    visibility: 'PUBLIC'
                }
            );

            if (response.isError) {
                throw new Error(response.content[0].text);
            }

            new Notice('Successfully posted to LinkedIn!', 3000);
        } catch (error: any) {
            console.error('Failed to post to LinkedIn:', error);
            new Notice(`Failed to post to LinkedIn: ${error.message}`, 5000);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SocialPostsSettingTab extends PluginSettingTab {
    plugin: SocialPostsPlugin;

    constructor(app: App, plugin: SocialPostsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    override display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Social Posts Settings'});

        new Setting(containerEl)
            .setName('MCP Server Name')
            .setDesc('The name of the MCP server to use for LinkedIn integration')
            .addText((text: TextComponent) => text
                .setPlaceholder('linkedin')
                .setValue(this.plugin.settings.mcpServerName)
                .onChange(async (value: string) => {
                    this.plugin.settings.mcpServerName = value;
                    await this.plugin.saveSettings();
                }));
    }
}
