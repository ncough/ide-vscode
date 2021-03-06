"use strict";
import {
  Disposable,
  ExtensionContext,
  Trace,
  window,
  commands,
} from "../ideApi/_IdeApi";
import {
  Commands,
  Notifications,
  DafnyUiManager,
  ICommands,
  IDafnyUiManager,
  INotifications,
} from "../ui/_UiModule";
import {
  CommandStrings,
  Error,
  Information,
  LanguageServerNotification,
} from "../stringResources/_StringResourcesModule";

import { ILanguageServer } from "./ILanguageServer";
import ServerOptions from "./serverOptions";
import { ILanguageServerInstaller } from "./ILanguageServerInstaller";
import { LanguageServerInstaller } from "./languageServerInstaller";

/**
 * This basically starts the Dafny language server and has been extracted from extension.ts ("Main").
 * It does also provide command registration for "restart language server".
 */
export class ServerInitializer implements ILanguageServer {
  private languageServer: ServerOptions | undefined;
  private languageServerDisposable: Disposable | undefined;
  private extensionContext: ExtensionContext;
  private provider: IDafnyUiManager | undefined;
  private commands: ICommands | undefined;

  constructor(extensionContext: ExtensionContext) {
    this.extensionContext = extensionContext;
  }

  public startLanguageServer(): void {
    this.installLanguageServerIfNotExists()
      .then(() => {
        this.languageServer = new ServerOptions();
        this.languageServer.trace = Trace.Verbose;

        this.languageServer
          .onReady()
          .then(() => {
            if (this.languageServer) {
              this.provider = new DafnyUiManager(this.languageServer);

              this.commands = new Commands(
                this.extensionContext,
                this.languageServer,
                this.provider
              );
              this.commands.registerCommands();

              const notifications: INotifications = new Notifications(
                this.languageServer
              );
              notifications.registerNotifications();
              this.provider.registerEventListener();
              this.registerServerVersionNotification();
            }
          })
          .catch((errorStart) => {
            window.showErrorMessage(
              Error.CouldNotStartServer + " " + errorStart
            );
          });

        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        this.languageServerDisposable = this.languageServer.start();
        this.extensionContext.subscriptions.push(this.languageServerDisposable);
      })
      .catch((errorInstall) => {
        window.showErrorMessage(
          Error.CouldNotInstallServer + " " + errorInstall
        );
      });
  }

  private async stopLanguageServer(): Promise<void> {
    await this.languageServer?.stop();
    if (this.provider) {
      this.provider.disposeUi();
    }
    if (this.commands) {
      this.commands.unregisterCommands();
    }
    this.languageServerDisposable = this.languageServerDisposable?.dispose();
  }

  // This function is not registered in commands.ts since it has a higher cohesion here
  public registerServerRestartCommand(): void {
    this.extensionContext.subscriptions.push(
      commands.registerCommand(CommandStrings.RestartServer, async () => {
        this.stopLanguageServer().then(() => {
          window.showErrorMessage(Error.ServerStopped);
          this.startLanguageServer();
        });
      })
    );
  }

  // Sent once when server has started (and after every server restart has been triggered)
  private registerServerVersionNotification(): void {
    if (this.languageServer) {
      this.languageServer.onNotification(
        LanguageServerNotification.DafnyLanguageServerVersionReceived,
        (serverversion: string) => {
          this.installLatestLanguageServer(serverversion);
        }
      );
    }
  }

  private async installLanguageServerIfNotExists(): Promise<boolean> {
    const installer: ILanguageServerInstaller = new LanguageServerInstaller();
    if (!installer.anyVersionInstalled()) {
      window.showInformationMessage(Information.InstallingServer);
      return await installer.installLatestVersion();
    }
    return Promise.resolve(true);
  }

  private installLatestLanguageServer(serverversion: string): void {
    const installer: ILanguageServerInstaller = new LanguageServerInstaller();
    installer
      .latestVersionInstalled(serverversion)
      .then((latestVersionInstalled: boolean) => {
        if (!latestVersionInstalled) {
          this.stopLanguageServer().then(() => {
            window.showErrorMessage(Error.ServerStopped);

            window.showInformationMessage(Information.UpdatingServer);
            installer.installLatestVersion().then(() => {
              this.startLanguageServer();
            });
          });
        }
      });
  }
}
