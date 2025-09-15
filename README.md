# blockos
blockos是可以运行js的webos，里面提供了命令注册方面的api，同时你也可以安装ve编辑器(visual editor)来在blockos里面开发你的js程序

blockos本身不自带ve，要用户添加ve.js并运行

blockosve合并了ve，建议使用blockosve
# 文件结构
```
/
├──disk
     ├──磁盘文件夹
├──disk1
├──disk2
...
```
# blockos与neo.js
neo.js是我之前开发的一个项目，主要目的是在web上运行js，但是随着需求的自己，neo.js逐渐不像一个运行平台，更像是一个系统，于是我重写了neo.js，然后blockos诞生

neo.js最大的缺点是没有一个稳定的文件管理系统，并且使用Local storage作为持久存储容器，这使得neo.js容量非常小，blockos允许用户保存磁盘为dk文件，这大大增加了存储容量，同时blockos还有稳定的文件管理系统，也更加命令行，有股unix的风范
# 未来可能加入的功能
- [ ] 进程管理器(我个人感觉暂时不需要)
- [ ] 支持国际化(我不确定，因为之前失败了，现在代码量又这么大)




# English
# blockos
blockos is a webos that can run js. It provides apis for command registration. Meanwhile, you can also install the ve editor (visual editor) to develop your js programs in blockos

blockos itself does not come with ve. Users are required to add ve.js and run it

blockosve has merged with ve. It is recommended to use blockosve
# File Structure
```
/
├──disk
    ├── Disk folder
├──disk1
├──disk2
...
```
# blockos and neo.js
neo.js was a project I developed before, whose main purpose was to run js on the web. However, as my own requirements changed, neo.js gradually became less like a running platform and more like a system. So I rewrote neo.js, and then blockos was born

The biggest drawback of neo.js is that it doesn't have a stable file management system and uses Local storage as the persistent storage container, which makes the capacity of neo.js very small. blockos allows users to save disks as dk files, which greatly increases the storage capacity. Meanwhile, blockos also has a stable file management system. It is also more command-line and has a unix style
# Possible features to be added in the future
- [ ] Process Manager (I personally feel it's not needed for the time being)
- [ ] Support internationalization (I'm not sure because it failed before and now the codebase is so large)
# Language
Blockos does not support i18n; I have tried, but failed. Since the core of Blockos is in Chinese, I ask non-Chinese language users to translate the source code themselves, thank you.
