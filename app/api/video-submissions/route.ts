function retired() {
  return Response.json(
    { error: "Videos have been retired. Visit Mind Break for games." },
    { status: 410 },
  );
}
export const GET = retired;
export const POST = retired;
export const PATCH = retired;
export const DELETE = retired;
