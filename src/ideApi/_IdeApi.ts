"use strict";
/*
 * Module for encapsulation of the IDE API.
 * Allows simple implementation of adapter components for other IDEs.
 */
export {
  window,
  commands,
  workspace,
  WorkspaceConfiguration,
  ExtensionContext,
  Disposable,
  Uri,
  Position,
  Range,
  Location,
  TextDocument,
  TextEditor,
  TextDocumentChangeEvent,
  DecorationOptions,
  TextEditorDecorationType,
  DecorationRenderOptions,
  InputBoxOptions,
  StatusBarItem,
  StatusBarAlignment,
} from "vscode";

export {
  LanguageClient,
  LanguageClientOptions,
  ResponseError,
  ServerOptions as ClientServerOptions,
  TextDocumentIdentifier,
} from "vscode-languageclient";

export { URI } from "vscode-uri";
export { Trace } from "vscode-jsonrpc";
