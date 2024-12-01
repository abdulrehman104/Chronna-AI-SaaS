"use server";

import { extractEmailsFromString, extractURLfromString } from "@/lib/utils";
import { clerkClient } from "@clerk/nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { onRealTimeChat } from "../conversation";
import { onMailer } from "../mailer";
import client from "@/lib/client";

export const onGetCurrentChatBot = async (id: string) => {
  try {
    const chatbot = await client.domain.findUnique({
      where: {
        id,
      },
      select: {
        helpdesk: true,
        name: true,
        chatBot: {
          select: {
            id: true,
            welcomeMessage: true,
            icon: true,
            textColor: true,
            background: true,
            helpdesk: true,
          },
        },
      },
    });

    if (chatbot) {
      return chatbot;
    }
  } catch (error) {
    console.log(error);
  }
};

export const onStoreConversations = async (
  id: string,
  message: string,
  role: "assistant" | "user"
) => {
  await client.chatRoom.update({
    where: {
      id,
    },
    data: {
      message: {
        create: {
          message,
          role,
        },
      },
    },
  });
};

// ====================== Chatbot Functionality with Gemini Model ======================
const apiKey = process.env.GEMINI_API_KEY;
// @ts-ignore
const googleai = new GoogleGenerativeAI(apiKey);
const model = googleai.getGenerativeModel({ model: "gemini-1.5-flash" });

let customerEmail: string | undefined;

export const onAiChatBotAssistant = async (
  id: string,
  chat: { role: "assistant" | "user"; content: string }[],
  author: "user",
  message: string
) => {
  try {
    const chatBotDomain = await client.domain.findUnique({
      where: { id },
      select: {
        name: true,
        filterQuestions: {
          where: { answered: null },
          select: { question: true },
        },
      },
    });

    if (chatBotDomain) {
      const extractedEmail = extractEmailsFromString(message);
      if (extractedEmail) {
        customerEmail = extractedEmail[0];
      }

      if (customerEmail) {
        const checkCustomer = await client.domain.findUnique({
          where: { id },
          select: {
            User: { select: { clerkId: true } },
            name: true,
            customer: {
              where: { email: { startsWith: customerEmail } },
              select: {
                id: true,
                email: true,
                questions: true,
                chatRoom: {
                  select: { id: true, live: true, mailed: true },
                },
              },
            },
          },
        });

        if (checkCustomer && !checkCustomer.customer.length) {
          const newCustomer = await client.domain.update({
            where: { id },
            data: {
              customer: {
                create: {
                  email: customerEmail,
                  questions: { create: chatBotDomain.filterQuestions },
                  chatRoom: { create: {} },
                },
              },
            },
          });

          if (newCustomer) {
            console.log("New customer created");
            const response = {
              role: "assistant",
              content: `Welcome aboard ${
                customerEmail.split("@")[0]
              }! I'm glad to connect with you. Is there anything you need help with?`,
            };
            return { response };
          }
        }

        if (checkCustomer && checkCustomer.customer[0].chatRoom[0].live) {
          await onStoreConversations(
            checkCustomer?.customer[0].chatRoom[0].id!,
            message,
            author
          );

          onRealTimeChat(
            checkCustomer.customer[0].chatRoom[0].id,
            message,
            "user",
            author
          );

          if (!checkCustomer.customer[0].chatRoom[0].mailed) {
            const user = await clerkClient.users.getUser(
              checkCustomer.User?.clerkId!
            );

            onMailer(user.emailAddresses[0].emailAddress);

            // Update mail status to prevent spamming
            const mailed = await client.chatRoom.update({
              where: { id: checkCustomer.customer[0].chatRoom[0].id },
              data: { mailed: true },
            });

            if (mailed) {
              return {
                live: true,
                chatRoom: checkCustomer.customer[0].chatRoom[0].id,
              };
            }
          }
          return {
            live: true,
            chatRoom: checkCustomer.customer[0].chatRoom[0].id,
          };
        }

        await onStoreConversations(
          checkCustomer?.customer[0].chatRoom[0].id!,
          message,
          author
        );

        // Google AI Chat Completion
        const chatCompletion = await model.generateContent({
          contents: [
            {
              role: "assistant",
              parts: [
                {
                  text: `
                You will get an array of questions that you must ask the customer.

                Progress the conversation using those questions.

                Whenever you ask a question from the array, I need you to add a keyword at the end of the question (complete). This keyword is extremely important.

                Do not forget it.

                Only add this keyword when you're asking a question from the array of questions. No other question satisfies this condition.

                Always maintain character and stay respectful.

                The array of questions: [${chatBotDomain.filterQuestions
                  .map((questions) => questions.question)
                  .join(", ")}].

                If the customer says something out of context or inappropriate, simply say this is beyond you and you will get a real user to continue the conversation. Add a keyword (realtime) at the end.

                If the customer agrees to book an appointment, send them this link:
                http://localhost:3000/portal/${id}/appointment/${
                    checkCustomer?.customer[0].id
                  }.

              if the customer wants to buy a product redirect them to the payment page http://localhost:3000/portal/${id}/payment/${
                    checkCustomer?.customer[0].id
                  }
              `,
                },
              ],
            },
            ...chat.map((msg) => ({
              role: msg.role === "assistant" ? "model" : "user",
              parts: [{ text: msg.content }],
            })),
            {
              role: "user",
              parts: [{ text: message }],
            },
          ],
        });

        const chatResponse = chatCompletion.response?.text();

        if (chatResponse?.includes("(realtime)")) {
          await client.chatRoom.update({
            where: { id: checkCustomer?.customer[0].chatRoom[0].id },
            data: { live: true },
          });

          const response = {
            role: "assistant",
            content: chatResponse.replace("(realtime)", ""),
          };

          await onStoreConversations(
            checkCustomer?.customer[0].chatRoom[0].id!,
            response.content,
            "assistant"
          );

          return { response };
        }

        if (chat[chat.length - 1].content.includes("(complete)")) {
          const firstUnansweredQuestion =
            await client.customerResponses.findFirst({
              where: {
                customerId: checkCustomer?.customer[0].id,
                answered: null,
              },
              select: { id: true },
              orderBy: { question: "asc" },
            });

          if (firstUnansweredQuestion) {
            await client.customerResponses.update({
              where: { id: firstUnansweredQuestion.id },
              data: { answered: message },
            });
          }
        }

        if (chatResponse) {
          const generatedLink = extractURLfromString(chatResponse);

          if (generatedLink) {
            const link = generatedLink[0];
            const response = {
              role: "assistant",
              content: `Great! You can follow the link to proceed.`,
              link: link.slice(0, -1),
            };

            await onStoreConversations(
              checkCustomer?.customer[0].chatRoom[0].id!,
              `${response.content} ${response.link}`,
              "assistant"
            );

            return { response };
          }

          const response = {
            role: "assistant",
            content: chatResponse,
          };

          await onStoreConversations(
            checkCustomer?.customer[0].chatRoom[0].id!,
            `${response.content}`,
            "assistant"
          );

          return { response };
        }
      }
    }

    console.log("No customer found.");

    // Google AI Chat Completion for New Customers
    const newCustomerChat = await model.generateContent({
      contents: [
        {
          role: "assistant",
          parts: [
            {
              text: `
          You are a highly knowledgeable and experienced sales representative for a ${chatBotDomain?.name} that offers a valuable product or service. Your goal is to have a natural, human-like conversation with the customer in order to understand their needs, provide relevant information, and ultimately guide them towards making a purchase or redirect them to a link if they havent provided all relevant information.
          Right now you are talking to a customer for the first time. Start by giving them a warm welcome on behalf of ${chatBotDomain?.name} and make them feel welcomed.

          Your next task is lead the conversation naturally to get the customers email address. Be respectful and never break character.`,
            },
          ],
        },
        ...chat.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    });

    if (newCustomerChat) {
      const response = {
        role: "assistant",
        content: newCustomerChat.response?.text() || "",
      };

      return { response };
    }
  } catch (error) {
    console.error("Error in onAiChatBotAssistant:", error);
  }
};
