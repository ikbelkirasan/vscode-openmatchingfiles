'use strict';
import * as path from 'path';
import {
    commands, window, workspace, ExtensionContext, QuickPickItem, Uri, ViewColumn
} from 'vscode';

interface OpenMatchingFilesQuickPickItem extends QuickPickItem {
    command?: 'prompt' | 'affirmative' | 'file';
    uri?: Uri;
}

export function activate(context: ExtensionContext) {
    //const ch = window.createOutputChannel('openMatchingFiles');

    const disposableOpenMatchingFilesCommand = commands.registerCommand('extension.openMatchingFiles', async () => {        
        let userInputValue;
        while (true) {
            userInputValue = await window.showInputBox({ prompt: 'Search for a file name', value: userInputValue });
            if (!userInputValue) break;

            let queryValue = userInputValue;
            if (!userInputValue.endsWith('*')) { queryValue += '*'; }

            const foundFiles = await workspace.findFiles(`**/${queryValue}`);
            let quickPickItems: OpenMatchingFilesQuickPickItem[];
            if (!foundFiles || !foundFiles.length) {
                quickPickItems = [{
                    label: `\u21a9 No results for ${userInputValue}. Go back? (Press 'Enter' to confirm or 'Escape' to cancel)`,
                    description: '',
                    command: 'prompt'
                }];
            } else {
                quickPickItems = toQuickPickItems<OpenMatchingFilesQuickPickItem>(foundFiles);
                quickPickItems.splice(0, 0, {
                    label: `\u21b3 Open ${quickPickItems.length} file${quickPickItems.length > 1 ? 's' : ''} matching "${userInputValue}"`,
                    description: '',
                    command: 'affirmative'
                },
                    {
                        label: `\u21a9 Go back`,
                        description: '',
                        command: 'prompt'
                    }
                );

            }
            const quickPickResult = await window.showQuickPick(quickPickItems, { placeHolder: userInputValue });
            if (!quickPickResult) break;

            if (quickPickResult.command === 'prompt') {
                continue;
            }

            if (quickPickResult.command === 'affirmative' || quickPickResult.command === 'file') {                
                foundFiles.forEach(async uri => {
                    const doc = await workspace.openTextDocument(uri);
                    await window.showTextDocument(doc, { preview: false, preserveFocus: true, viewColumn: ViewColumn.Active });
                });
                break;
            }
        }
    });

    context.subscriptions.push(disposableOpenMatchingFilesCommand);
}

function toQuickPickItems<T extends OpenMatchingFilesQuickPickItem>(uris: Uri[]): T[] {
    return uris.map(uri => {
        const fsWorkspaceFolder = workspace && workspace.getWorkspaceFolder(uri);
        if(!fsWorkspaceFolder) return null;
        const fsPath = fsWorkspaceFolder.uri.fsPath;
        if(!fsPath) return null;
        const item = path.relative(fsPath, uri.fsPath);

        return !item ? null : {
            label: '    ' + path.basename(item),
            description: path.dirname(item),
            uri: uri,
            command: 'file'
            //detail: item
        };
    }).sort(function (a, b) {
        if(!a || !b) return 0;
        if (a.description < b.description) return -1;
        if (a.description > b.description) return 1;
        return 0;
    }) as T[];
}

export function deactivate(context: ExtensionContext) { }