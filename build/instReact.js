/** @jsx React.DOM */
;(function (window, React, $, page, undefined) {

  var $main = document.querySelector('.main'),
      $header = $('.header'),
      token = localStorage.accessToken,
      userId = localStorage.userId,
      timelineUrl = 'https://api.instagram.com/v1/users/self/feed?access_token=' + token,
      popularUrl = 'https://api.instagram.com/v1/media/popular/?access_token=' + token,
      loadOnScrollBottom = function(ctx, callback) {
        $(window).off('scroll');
        $(window).on('scroll', function() {
          if($(this).scrollTop() + $(this).height() == $(document).height()) {
            callback.call(ctx, ctx.state.pagination.next_url);
          }  
        });
      };

  /* === ROUTER START === */

  var Router = React.createClass({displayName: 'Router',
    getInitialState: function () {
      return {component: React.DOM.div(null)}
    },
    componentDidMount: function () {
      var self = this;

      this.props.routes.forEach(function (route) {

        var url = route[0];
        var Component = route[1];

        page(url, function (ctx) {
          self.setState({ 
            component: Component({params: ctx.params, querystring: ctx.querystring}) 
          });
        });

      });

      page.start();

      $header.find('.menu__link').on('click', function (e) {
        e.preventDefault();
        page(this.getAttribute('href'));
      });

    },
    render: function () {
      return this.state.component;
    }
  });

  /* === ROUTER END === */

  /* === TIMELINE COMPONENTS START === */

  var Timeline = React.createClass({displayName: 'Timeline',
    getInitialState: function () {
      return {
        data: [],
        pagination: {}
      };
    },

    loadData: function (url) {
      $.ajax({
        url: url|| timelineUrl,
        dataType: 'jsonp',
        success: function (data) {
          this.setState({
            data: this.state.data.concat(data.data),
            pagination: data.pagination
          });
        }.bind(this),
        error: function (err) {
          console.error(err);
        }.bind(this)
      });
    },

    componentDidMount: function () {
      this.loadData();
      
      loadOnScrollBottom(this, this.loadData);
    },

    render: function () {
      return (
        React.DOM.div({className: "timeline"}, 
          TimelineList({data: this.state.data})
        )
      );
    }
  });

  var TimelineList = React.createClass({displayName: 'TimelineList',
    render: function () {
      var timelineitem = this.props.data.map(function (picture) {
        return(TimelineItem({element: picture, user: picture.user, id: picture.id, type: picture.type}));
      });
      return (
        React.DOM.ul({className: "feed"}, 
          timelineitem
        )
      );
    }
  });

  var TimelineItem = React.createClass({displayName: 'TimelineItem',
    getInitialState: function () {
      return {
        liked: this.props.element.user_has_liked,
        likes: this.props.element.likes.count
      }
    },

    like: function () {
      var action = (this.state.liked) ? 'DELETE' : 'POST';

      // Make current type request
      $.ajax({
          type: 'GET',
          data: {
            "access_token": token,
            "photoId": this.props.id,
            "action": action
          },
          url: '../php/like.php',
          success: function () {
            // Change counter depending on request type
            if(this.state.liked){
              this.setState({liked: false, likes: this.state.likes - 1});
            } else {
              this.setState({liked: true, likes: this.state.likes + 1});
            }
          }.bind(this),
          error: function (err) {
            console.error(err);
          }
        });
    },

    render: function () {
      var element = (this.props.type === 'video') ? 
        TimelineVideo({src: this.props.element.videos.standard_resolution.url, id: this.props.id}) : 
        TimelinePhoto({src: this.props.element.images.standard_resolution.url, id: this.props.id, liked: this.props.element.user_has_liked, makeLike: this.like}); 

      return (
        React.DOM.li({className: "feed__item"}, 
          TimelineUser({
            liked: this.state.liked, 
            userId: this.props.user.id, 
            username: this.props.user.username, 
            avatar: this.props.user.profile_picture, 
            likes: this.state.likes, 
            photoId: this.props.element.id, 
            like: this.like}
          ), 
          React.DOM.div({className: "photo"}, 
            element, 
            CommentsList({comments: this.props.element.comments.data})
          )
        )
      );
    }
  });

  var TimelineUser = React.createClass({displayName: 'TimelineUser',
    render: function() {
      return (
        React.DOM.div({className: "user g-clf"}, 
          React.DOM.a({href: '/react/profile/' + this.props.userId, className: "user__pic"}, 
            React.DOM.img({src: this.props.avatar})
          ), 
          React.DOM.span({className: "user__name"}, this.props.username), 
          LikeHeart({likes: this.props.likes, liked: this.props.liked, makeLike: this.props.like})
        )
      );
    }
  });

  var LikeHeart = React.createClass({displayName: 'LikeHeart',
    render: function () {
      return (
        React.DOM.span({className: "user__likes"}, 
          React.DOM.i({className: this.props.liked ? 'user__like user__like_liked' : 'user__like', onClick: this.props.makeLike}), 
          React.DOM.span({className: "user__likes-count"}, this.props.likes)
        )
      );
    }
  });

  var TimelinePhoto = React.createClass({displayName: 'TimelinePhoto',
    getInitialState: function () {
      return {liked: this.props.liked};
    },

    render: function () {
      return (
        React.DOM.img({className: "photo__pic", id: this.props.id, src: this.props.src, onDoubleClick: this.props.makeLike}) 
      );
    }
  });

  var TimelineVideo = React.createClass({displayName: 'TimelineVideo',
    render: function () {
      return (
        React.DOM.video({className: "photo__pic", id: this.props.id, controls: true}, 
          React.DOM.source({src: this.props.src})
        )
      );
    }
  });

  var CommentsList = React.createClass({displayName: 'CommentsList',
    render: function() {
      var comment = this.props.comments.map(function (comment) {
        return(CommentsItem({src: comment.from.profile_picture, authorId: comment.from.id, author: comment.from.username, text: comment.text}));
      }); 
      return (
        React.DOM.ul({className: "comments"}, 
          comment
        )
      );
    }
  });

  var CommentsItem = React.createClass({displayName: 'CommentsItem',
    render: function() {
      return (
        React.DOM.li({className: "comments__item"}, 
          React.DOM.img({src: this.props.src, className: "comments__pic"}), 
          React.DOM.a({className: "comments__username", href: "/react/profile/"}, this.props.author), ": ", 
          React.DOM.span({className: "comments__text"}, this.props.text)
        )
      );
    }
  });

  /* === TIMELINE COMPONENTS END === */

  /* === SEARCH COMPONENTS START === */

  var Search = React.createClass({displayName: 'Search',
    getInitialState: function () {
      return {
        data: [],
        pagination: {},
        query: ''
      }
    },
    search: function (e) {
      e.preventDefault();
      var _this = this;
      $.ajax({
        url: 'https://api.instagram.com/v1/tags/' + _this.refs.searchInput.state.value + '/media/recent?&access_token=' + token,
        dataType: 'jsonp',
        success: function (data) {
          if (data.meta.code === 200) {
            this.setState({
              data: data.data,
              pagination: data.pagination
            });
            loadOnScrollBottom(this, this.searchScrollBottom);
          } else {
            this.deniedTag();
          }
        }.bind(this),
        error: function (err) {
          console.error(err);
        }
      });
    },
    searchScrollBottom: function (url) {
      $.ajax({
        url: url,
        dataType: 'jsonp',
        success: function (data) {
          this.setState({
            data: this.state.data.concat(data.data),
            pagination: data.pagination
          });
        }.bind(this),
        error: function (err) {
          console.error(err);
        }
      });
    },
    loadPopular: function (url) {
      $.ajax({
        url: url || popularUrl,
        dataType: 'jsonp',
        success: function (data) {
          this.setState({
            data: this.state.data.concat(data.data),
            pagination: data.pagination
          });
        }.bind(this),
        error: function (err) {
          console.error(err);
        }
      });
    },
    deniedTag: function () {
      this.refs.searchInput.getDOMNode().style.border = '2px solid #f00';
      window.setTimeout(function () {
        this.refs.searchInput.getDOMNode().style.border = 'none';
      }.bind(this), 2000);
    },
    componentDidMount: function () {
      this.loadPopular();
      $(window).off('scroll');
    },
    render: function () {
      return (
        React.DOM.div({className: "search"}, 
          React.DOM.form({className: "search__form", onSubmit: this.search}, 
            React.DOM.input({type: "text", defaultValue: this.state.query, ref: "searchInput", className: "search__input", placeholder: "Search photo by Hashtag"})
          ), 
          ResultList({searchResult: this.state.data})
        )
      );
    }
  });

  var ResultList = React.createClass({displayName: 'ResultList',
    render: function () {
      var items = this.props.searchResult.map(function (photo) {
        return (
          React.DOM.a({className: "photo-list__item fancybox", 
             href: photo.images.standard_resolution.url, 
             title: photo.caption && photo.caption.text || ''}, 
            React.DOM.img({src: photo.images.standard_resolution.url})
          )
        )
      });
      return (
        React.DOM.div({className: "photo-list"}, 
          items
        )
      );
    }
  });

  /* === SEARCH COMPONENTS END === */
  
  /* === 404 COMPONENTS END === */

  var PageNotFound = React.createClass({displayName: 'PageNotFound',
    render: function () {
      return (
        React.DOM.div(null, "Page not found")
      );
    }
  });

  /* === 404 COMPONENTS END === */
  
  /* === PROFILE COMPONENTS START === */
  
  var Profile = React.createClass({displayName: 'Profile',
    getInitialState: function () {
      return {
        user: {},
        counts: {},
        photos: [],
        pagination: {}
      }
    },
    getProfileData: function () {
      $.ajax({
        url: 'https://api.instagram.com/v1/users/' + this.props.params.id + '?access_token=' + token,
        dataType: 'jsonp',
        success: function (data) {
          this.setState({
            user: data.data,
            counts: data.data.counts
          });
        }.bind(this),
        error: function (err) {
          console.error(err);
        }
      })
    },
    getProfilePhotos: function (url) {
      $.ajax({
        url: url || 'https://api.instagram.com/v1/users/' + this.props.params.id + '/media/recent?access_token=' + token,
        dataType: 'jsonp',
        success: function (data) {
          this.setState({
            photos: this.state.photos.concat(data.data),
            pagination: data.pagination
          });
          loadOnScrollBottom(this, this.getProfilePhotos)
        }.bind(this),
        error: function (err) {
          console.error(err);
        }
      });
    },
    componentDidMount: function () {
      this.getProfileData();
      this.getProfilePhotos();
      $header.find('.profile__link_followers').on('click', function (e) {
        e.preventDefault();
        page(this.getAttribute('href'));
      });
    },
    render: function () {
      var photos = this.state.photos.map(function (photo) {
        return (React.DOM.div({className: "photo-list__item"}, 
                  React.DOM.a({className: "fancybox", href: photo.images.standard_resolution.url}, 
                    React.DOM.img({src: photo.images.low_resolution.url, title: photo.caption && photo.caption.text || ''})
                  ), 
                  React.DOM.span({className: "photo-list__likes", onClick: this.photoLike}, "Likes: ", photo.likes.count)
                )
        );
      });
      return (
        React.DOM.div({className: "profile"}, 
          React.DOM.div({className: "profile__data"}, 
            React.DOM.div({className: "profile__photo"}, 
              React.DOM.img({src: this.state.user.profile_picture, alt: this.state.user.username, className: "profile__picture"})
            ), 
            React.DOM.div({className: "profile__username"}, this.state.user.username), 
            React.DOM.ul({className: "profile__stats"}, 
              React.DOM.li({className: "profile__item"}, 
                React.DOM.span({className: "profile__count"}, "Photos"), React.DOM.br(null), 
                React.DOM.span({className: "profile__media-digits"}, this.state.counts.media)
              ), 
              React.DOM.li({className: "profile__item"}, 
                React.DOM.a({className: "profile__link_followers", href: '/react/profile/' + this.state.user.id + '/followed-by/'}, 
                  React.DOM.span({className: "profile__count"}, "Followers"), React.DOM.br(null), 
                  React.DOM.span({className: "profile__followed_by-digits"}, this.state.counts.followed_by)
                )
              ), 
              React.DOM.li({className: "profile__item"}, 
                React.DOM.a({className: "profile__link_followers", href: '/react/profile/' + this.state.user.id + '/follows/'}, 
                  React.DOM.span({className: "profile__count profile__count_follow"}, "Follow"), React.DOM.br(null), 
                  React.DOM.span({className: "profile__follows-digits"}, this.state.counts.follows)
                )
              )
            ), 
            React.DOM.ul({className: "profile__info"}, 
              React.DOM.li({className: "profile__item"}, this.state.user.full_name), 
              React.DOM.li({className: "profile__item"}, this.state.user.bio), 
              React.DOM.li({className: "profile__item"}, 
                React.DOM.a({href: this.state.user.website, target: "_blank", className: "profile__url"}, 
                  this.state.user.website
                )
              )
            )
          ), 
          React.DOM.div({className: "photo-list"}, 
            photos
          )
        )
      );
    }
  });

  /* === PROFILE COMPONENTS END === */
  
  /* === ABOUT COMPONENTS START === */
  
  var About = React.createClass({displayName: 'About',
    render: function () {
      return (
        React.DOM.div(null, "About")
      );
    }
  });

  /* === ABOUT COMPONENTS END === */
  
  /* === FOLLOWERS COMPONENTS START === */
  
  var Followers = React.createClass({displayName: 'Followers',
    getInitialState: function () {
      return {
        followers: [],
        pagination: {}
      }
    },
    getFollowers: function (url) {
      $.ajax({
        url: url || 'https://api.instagram.com/v1/users/' + this.props.params.id + '/' + this.props.params.method + '?access_token=' + token,
        dataType: 'jsonp',
        success: function (data) {
          this.setState({
            followers: this.state.followers.concat(data.data),
            pagination: data.pagination
          });
        }.bind(this),
        error: function (err) {
          console.error(err);
        }
      })
    },
    componentDidMount: function () {
      this.getFollowers();
      loadOnScrollBottom(this, this.getFollowers);
    },
    changeRelationship: function () {
      return false;
    },
    getRelationshipStatus: function (follower, callback) {
      $.ajax({
        url: 'https://api.instagram.com/v1/users/' + follower.id + '/relationship?access_token=' + token,
        dataType: 'jsonp',
        success: function (data) {
          follower.status = {};
          follower.status.outgoing_status = data.data;
        },
        error: function (err) {
          console.error(err);
        }
      });
    },
    render: function () {
      var _this = this;
      var followers = this.state.followers.map(function(follower) {
        _this.getRelationshipStatus(follower);
        return (
          React.DOM.div({className: "follow__item"}, 
            React.DOM.a({href: '/react/profile/' + follower.id + '/'}, 
              React.DOM.img({className: "follow__avatar", src: follower.profile_picture}), 
              React.DOM.span({className: "follow__username"}, "@", follower.username)
            )
          )
        );
      });
      return (
        React.DOM.div({className: "follow"}, 
          React.DOM.header({className: "follow__header"}, this.props.params.method === 'follows' && 'Follows' || 'Followers'), 
          React.DOM.div({className: "follow__list"}, 
            followers
          )
        )
      );
    }
  });

  /* === FOLLOWERS COMPONENTS END === */
  
  /* === MENU COMPONENTS START === */

  var Menu = React.createClass({displayName: 'Menu',
    render: function () {
      var links = this.props.links.map(function (link) {
        return (React.DOM.li({className: "menu__item"}, React.DOM.a({className: "menu__link", href: (link[1] === 'Profile') ? link[0] + userId + '/' : link[0]}, link[1])));
      });
      return (
        React.DOM.ul({className: "menu g-clf"}, 
          links
        )
      ); 
    }
  });

  /* === MENU COMPONENTS END === */

  var routes = [
    ['/react/', Timeline],
    ['/react/search/', Search],
    ['/react/profile/:id/', Profile],
    ['/react/profile/:id/:method/', Followers],
    ['/react/about/', About],
    ['*', PageNotFound]
  ];

  var links = [
    ['/react/', 'Timeline'],
    ['/react/search/', 'Search'],
    ['/react/profile/', 'Profile'],
    ['/react/about/', 'About'],
    ['/react/', 'Follow Me']
  ];

  React.renderComponent(Menu({links: links}), $header[0]);
  React.renderComponent(Router({routes: routes}), $main);

}(window, window.React, window.jQuery, window.page));