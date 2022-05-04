/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {existsSync, readFileSync, writeFileSync} from "fs";
import {Context, SQSEvent, SQSRecord} from "aws-lambda";
import any = jasmine.any;
import {DynamoDBClient, UpdateItemCommand} from "@aws-sdk/client-dynamodb";
import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {SFNClient, StartExecutionCommand} from "@aws-sdk/client-sfn";

const ddbClient = new DynamoDBClient({logger: console})
const sfnClient = new SFNClient({logger: console})
const sqsClient = new SQSClient({logger: console})
export const handler = async (event: SQSEvent, context: Context): Promise<{ [name: string]: string | number | undefined }> => {
    console.log(`"Event: ${JSON.stringify(event)}`)
    for (const record of event.Records) {
        const body = JSON.parse(record.body)
        const stepFunctionArn = process.env.STATE_MACHINE_ARN

        if (stepFunctionArn != null) {
            try {
                const response = await ddbClient.send(new UpdateItemCommand({
                    TableName: process.env.TABLE_NAME,
                    Key: {
                        "pk": {
                            S: stepFunctionArn
                        }

                    },
                    UpdateExpression: "ADD #c :inc",
                    ExpressionAttributeNames: {
                        "#c": "counter"
                    },
                    ExpressionAttributeValues: {
                        ":inc": {
                            N: "1"
                        },
                        ":MAX_CONCURRENCY": {
                            N: process.env.MAX_CONCURRENCY!
                        }
                    },
                    ConditionExpression: "#c < :MAX_CONCURRENCY"

                }))
                const sfnResponse=await sfnClient.send(new StartExecutionCommand({
                    stateMachineArn: process.env.STATE_MACHINE_ARN,
                    input: JSON.stringify(body),
                    traceHeader: record.messageId
                }))
                console.log(`Execution ARN: ${sfnResponse.executionArn} started ${sfnResponse.startDate}`)
            } catch (e) {
                const error = e as Error
                console.error(`Error: ${error}`)
                if("ConditionalCheckFailedException"==error.name) {

                    try {
                        await sqsClient.send(new SendMessageCommand({
                            DelaySeconds: Math.floor(Math.random() * (120 - 15 + 1) + 15),
                            QueueUrl: process.env.QUEUE_URL,
                            MessageBody: JSON.stringify(body)
                        }))
                    } catch (e1) {
                        const error1 = e1 as Error
                        console.error(`Error returning message to queue : ${error1}`)
                    }
                }

            }
        } else {
            throw new Error("No step function arn provided")
        }
    }

    return {}

};