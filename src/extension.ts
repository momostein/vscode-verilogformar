// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as temp from 'temp';
import * as child from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	vscode.languages.registerDocumentFormattingEditProvider({ scheme: "file", language: "verilog" }, {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			let result: vscode.TextEdit[] = [];
			const verilogformat = <string>vscode.workspace.getConfiguration().get('verilog-format.path');
			const globalSettings = <string>vscode.workspace.getConfiguration().get('verilog-format.settings');

			// What if you want to use verilog-format from path?
			// This won't work then!
			// if (!validFile(verilogformat)) {
			// 	vscode.window.showErrorMessage('Executable ' + verilogformat + '  not found, set Settings verilog-format.path');
			// 	return result;
			// }

			var args: string[] = ["-f",];
			var tempfile: string = "";

			try {
				tempfile = createTempFileOfDocument(document);
			} catch (error) {
				vscode.window.showErrorMessage('Verilog Format: ' + error.message);
				return result;
			}

			args.push(tempfile);

			var hasSettingsFile: boolean = false;
			var settingsFile: string = '';

			var localSettings = path.dirname(document.fileName)
				+ path.sep
				+ ".verilog-format.properties";

			if (validFile(localSettings)) {
				console.log('Local settings found');
				settingsFile = localSettings;
				hasSettingsFile = true;
			} else if (globalSettings) {
				console.log('Global settings found');
				settingsFile = globalSettings;
				hasSettingsFile = true;
			}

			if (settingsFile) {
				args.push("-s");
				args.push(settingsFile);
			}

			try {
				if (verilogformat) {
					let command: string = `${verilogformat} ${args.join(" ")}`;
					console.log(`Executing command: "${command}"`);
					child.execFileSync(verilogformat, args, {});
				} else {
					let command: string = `verilog-format ${args.join(" ")}`;
					console.log(`Executing command: "${command}"`);
					child.execSync(command);
				}

				result = determineEdits(document, tempfile);

			} catch (error) {
				console.log(error);
				vscode.window.showErrorMessage('Verilog Format: ' + error.message);
			}

			return result;
		}
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }


function createTempFileOfDocument(document: vscode.TextDocument): string {
	const content = document.getText();
	const tempfile = temp.openSync();

	if (tempfile === undefined) {
		throw new Error("Unable to create temporary file");
	}

	fs.writeSync(tempfile.fd, content);
	fs.closeSync(tempfile.fd);
	return tempfile.path;
}

function determineEdits(document: vscode.TextDocument, tempfile: string): vscode.TextEdit[] {
	const origContent = document.getText();
	const wholeFile = new vscode.Range(document.positionAt(0),
		document.positionAt(origContent.length));
	const formatted = fs.readFileSync(tempfile, { encoding: "utf8" });
	return [
		vscode.TextEdit.replace(wholeFile, formatted),
	];
}

function validFile(file: string): boolean {

	try {
		if (file === undefined) {
			return false;
		}

		if (file.length === 0) {
			return false;
		}

		if (fs.existsSync(file)) {
			return true;
		}
	} catch (err) {
		console.log(err);
	}

	return false;
}