/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { TPromise } from 'vs/base/common/winjs.base';
import { IChannel } from 'vs/base/parts/ipc/common/ipc';
import { ITelemetryAppender } from 'vs/platform/telemetry/common/telemetryUtils';
import { Event } from 'vs/base/common/event';

export interface ITelemetryLog {
	eventName: string;
	data?: any;
}

export interface ITelemetryAppenderChannel extends IChannel {
	call(command: 'log', data: ITelemetryLog): TPromise<void>;
	call(command: string, arg: any): TPromise<any>;
}

export class TelemetryAppenderChannel implements ITelemetryAppenderChannel {

	constructor(private appender: ITelemetryAppender) { }

	listen<T>(event: string, arg?: any): Event<T> {
		throw new Error('No events');
	}

	call(command: string, { eventName, data }: ITelemetryLog): TPromise<any> {
		this.appender.log(eventName, data);
		return TPromise.as(null);
	}
}

export class TelemetryAppenderClient implements ITelemetryAppender {

	constructor(private channel: ITelemetryAppenderChannel) { }

	log(eventName: string, data?: any): any {
		this.channel.call('log', { eventName, data })
			.done(null, err => `Failed to log telemetry: ${console.warn(err)}`);

		return TPromise.as(null);
	}

	dispose(): any {
		// TODO
	}
}