# 我与 Multi-agent

*--卧槽，读到绝世好文了。*
![[Pasted image 20260124164002.png]]
## 重操旧业
今天我花了点时间，回到对于multi-agent系统（现在好像流行叫MAS）的学习中了。
我的习惯是，只要是跟Agent有关的事儿，都会先看一眼Claude有没有更新新的Blog来讲。然后今天就看到了这篇绝世好文。wok，真的太好了，让我花了半个小时复盘，还推荐给了许多同行。
![[Pasted image 20260125015442.png]]
## 我与Multi-agent
其实我最开始做Agent的时候，就被领入了multi-agent的流派。过了三个月我才知道，卧槽，我被骗了，那不是multi-agent，甚至不是agent，那他妈是workflow。Wok，直到那个时候我才知道workflow和agent是两回事儿。然而当时的我已经在workflow上走了很长的一段路了，就硬着头皮，做了一些作品，也做了一些学术上的贡献。但是，wok，想起来还是很亏。
当时点醒我的，正好就是Claude的一篇关于web-agent的blog，是multi-agent应用的一篇实例。在那个里面，我察觉到multi-agent里面的各个agent只有“身份”可能是被预先定死的，而“工作方式”一定是动态的。~此时我反应过来，我们整个组好像都弄错了。
随后我开始真正地了解multi-agent ，接触了许多实例，比如MetaGPT之类的。唉，然后前一段时间，opencode突然出圈了，我就去看了它的很火的一个插件，叫oh-my-opencode，那个里面提供了一种multi-agent架构。我很喜欢。
当时整个推特都在鼓吹opencode，说opencode+oh-my-opencode > Claude code。直观上来说，我也觉得omo那个架构真的很棒，因为限定了agent的工具调用，还避免了上下文污染。嗯，我有点狂热崇拜这个架构。
## Claude的文章
这篇文章的好的点很多，我被震撼了很多次，很多困惑都一扫而空。很开心，嘿嘿。
最开心的是，它驳倒了我一直以来的思维定式。🤔，大概来说，就是，就像MetaGPT和omo，会以面临的问题，来设计MAS，这样其实是错的，结果往往适得其反。正确的方式是，以上下文来创建MAS，唉不细说不细说。
总之，好文章，然后突然对学习multi-agent的这个过程有点感慨。唉。
