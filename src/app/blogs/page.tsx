import parse from "html-react-parser";
import Image from "next/image";
import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { NavBar } from "@/components/navbar";

import { onGetBlogPosts } from "@/actions/landing";
import { getMonthName } from "@/lib/utils";

export default async function BlogsPage() {
  const posts:
    | {
        id: string;
        title: string;
        image: string;
        content: string;
        createdAt: Date;
      }[]
    | undefined = await onGetBlogPosts();

  return (
    <main>
      <NavBar />
      <section className="flex justify-center items-center flex-col gap-4 mt-10">
        <h2 className="text-4xl text-center">News Room</h2>
        <p className="text-muted-foreground text-center max-w-lg">
          Explore our insights on AI, technology, and optimizing your business.
        </p>
      </section>
      <section className="md:grid-cols-3 grid-cols-1 grid gap-5 container mt-8">
        {posts &&
          posts.map((post) => (
            <Link href={`/blogs/${post.id}`} key={post.id}>
              <Card className="flex flex-col gap-2 rounded-xl overflow-hidden h-full hover:bg-gray-100">
                <div className="relative w-full aspect-video">
                  <Image
                    src={`${process.env.CLOUDWAYS_UPLOADS_URL}${post.image}`}
                    alt="post featured image"
                    fill
                  />
                </div>
                <div className="py-5 px-10 flex flex-col gap-5">
                  <CardDescription>
                    {getMonthName(post.createdAt.getMonth())}{" "}
                    {post.createdAt.getDate()} {post.createdAt.getFullYear()}
                  </CardDescription>
                  <CardTitle>{post.title}</CardTitle>
                  {parse(post.content.slice(33, 133))}...
                </div>
              </Card>
            </Link>
          ))}
      </section>
    </main>
  );
}
