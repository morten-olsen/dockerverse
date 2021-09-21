import Docker from 'dockerode';

export const hasImage = async (docker: Docker, name: string) => {
  const [repo, tag = 'latest'] = name.split(':');
  const updatedName = `${repo}:${tag}`;
  const images = await docker.listImages();
  const image = images.find(i => i.RepoTags.includes(updatedName));
  return !!image;
}

export const pullImage = async (docker: Docker, name: string) => {
  const [repo, tag = 'latest'] = name.split(':');
  const stream = await docker.pull(`${repo}:${tag}`);

  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
  });
}
