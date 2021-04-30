import {stringify} from 'csv';

const monk = require('monk');
const MONGO_CONN_STRING = process.env.URI;
const db = monk(MONGO_CONN_STRING);
const threads = db.get('threads');

export interface Thread {
  _id?: string;
  username: string;
  title: string;
  content: string;
  posts: Post[];

  // stores username: vote_value
  votes: {};
}

export interface Post {
  username: string;
  content: string;
  date: string;
  id: string;
  childrenIDs: [];
  parentID: string;
  imageURL: string;

  // stores username: vote_value
  votes: {};
}

/** Makes a post. */
async function makePost(post: Post, threadID: string) {
  try {
    threads.update({_id: threadID}, {$push: {posts: post}});
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

/** Gets the user's vote for the specified post */
async function getUsersVotes(username: string, postID: string) {
  try {
    const resp = await threads.findOne(
      {'posts.id': postID},
      `posts.votes.${username}.$`
    );

    // TODO error handling
    const votes: Object = resp.posts[0].votes;
    if (Object.prototype.hasOwnProperty.call(votes, username)) {
      return votes[username];
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
}

/** Gets the number of votes for a post. */
async function getPostVotes(postID: string) {
  try {
    const resp = await threads.findOne({'posts.id': postID}, 'posts.votes.$');

    // TODO use aggregate later, don't know how currently
    const votes: Object = resp.posts[0].votes;
    let total = 0;
    for (const vote in votes) {
      total += votes[vote];
    }

    return total.toString();
  } catch (error) {
    console.log(error);
    return false;
  }
}

/** Upvotes a post. */
async function upvotePost(postID: string, vote: string, userID: string) {
  try {
    let numVote = parseInt(vote);
    const query = 'posts.$.votes.' + userID;

    // if upvoting when current vote is downvote, then set vote to 0
    const currentVote = await getUsersVotes(userID, postID);
    if (currentVote + numVote === 0) {
      numVote = 0;
    }

    const resp = await threads.update(
      {'posts.id': postID},
      {$set: {[query]: numVote}}
    );
    return resp;
  } catch (error) {
    console.log(error);
    return false;
  }
}

/** Deletes specified thread. */
async function deleteThread(threadID: string) {
  threads.remove({_id: threadID});
  return true;
}

/** Makes a thread. */
async function makeThread(thread: Thread) {
  threads.insert(thread);
  return true;
  // TODO error check
}

/** Gets all threads */
async function getThreads(): Promise<Thread[]> {
  return await threads.find({}, {fields: {posts: 0}});
  // TODO without the posts too laggy
}

/** Gets a thread*/
async function getThread(id: string) {
  return await threads.findOne({_id: id});
}

/** Gets all the posts for parentID */
async function getChildrenPosts(parentID: string) {
  try {
    const result = await threads.findOne(
      {'posts.id': parentID},
      'posts.childrenIDs.$'
    );

    //  posts[0] because findOne above still returns array
    return result.posts[0].childrenIDs;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/** Appends the child to the parent posts children. */
async function updatePostChildren(
  threadID: string,
  parentID: string,
  childID: string
) {
  try {
    await threads.update(
      {_id: threadID, 'posts.id': parentID}, // might be faster
      {$push: {'posts.$.childrenIDs': childID}}
    );
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

/** Deletes the specified post by clearing all details and
 * adding a deleted flag. // TODO only allow if you are the owner
 */
async function deletePost(threadID: string, postID: string) {
  try {
    // clear all user data from post
    const res = await threads.update(
      {_id: threadID, 'posts.id': postID},
      {$set: {'posts.$.content': '', 'posts.$.imageURL': ''}} // todo clear image too
    );

    // set deleted flag
    const res2 = await threads.update(
      {_id: threadID, 'posts.id': postID},
      {$set: {'posts.$.deleted': true}}
    );
  } catch (err) {
    console.log(err);
    return false;
  }
  return true;
}

async function temp() {
  const query = {
    content: 'g',
  };
  return threads.find(query);
}

/** Gets the specified post */
async function getPost(threadID: string, postID: string) {
  try {
    const query = {_id: threadID, 'posts.id': postID};
    const resp = await threads.findOne(query, 'posts.$');

    return resp.posts[0];
  } catch (err) {
    console.log(err);
    return false;
  }
}

export default {
  makeThread,
  getThreads,
  getPost,
  getThread,
  makePost,
  deleteThread,
  updatePostChildren,
  temp,
  upvotePost,
  getChildrenPosts,
  deletePost,
  getPostVotes,
  getUsersVotes,
};
