/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RipgrepFileSearchEngine } from './ripgrepFileSearch';
import { RipgrepTextSearchEngine } from './ripgrepTextSearch';
import { joinPath } from './utils';

export function activate(): void {
	if (vscode.workspace.getConfiguration('searchRipgrep').get('enable')) {
		const outputChannel = vscode.window.createOutputChannel('search-rg');

		const provider = new RipgrepSearchProvider(outputChannel);
		vscode.workspace.registerFileIndexProvider('file', provider);
		vscode.workspace.registerTextSearchProvider('file', provider);
	}
}

type SearchEngine = RipgrepFileSearchEngine | RipgrepTextSearchEngine;

class RipgrepSearchProvider implements vscode.FileIndexProvider, vscode.TextSearchProvider {
	private inProgress: Set<SearchEngine> = new Set();

	constructor(private outputChannel: vscode.OutputChannel) {
		process.once('exit', () => this.dispose());
	}

	provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Thenable<void> {
		const engine = new RipgrepTextSearchEngine(this.outputChannel);
		return this.withEngine(engine, () => engine.provideTextSearchResults(query, options, progress, token));
	}

	provideFileIndex(options: vscode.FileSearchOptions, token: vscode.CancellationToken): Thenable<vscode.Uri[]> {
		const engine = new RipgrepFileSearchEngine(this.outputChannel);

		const results: vscode.Uri[] = [];
		const onResult = relativePathMatch => {
			results.push(joinPath(options.folder, relativePathMatch));
		};

		return this.withEngine(engine, () => engine.provideFileSearchResults(options, { report: onResult }, token))
			.then(() => results);
	}

	private withEngine(engine: SearchEngine, fn: () => Thenable<void>): Thenable<void> {
		this.inProgress.add(engine);
		return fn().then(() => {
			this.inProgress.delete(engine);
		});
	}

	private dispose() {
		this.inProgress.forEach(engine => engine.cancel());
	}
}